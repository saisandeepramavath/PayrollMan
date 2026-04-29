#!/usr/bin/env python3
"""
Seed database with rich multi-tenant, multi-user, multi-project sample data.

Three companies:
  - TechCorp Solutions   (manager: Sunil)        - 7 engineers, 7 projects
  - DataFlow Inc         (manager: Priya Sharma) - 6 engineers, 5 projects
  - NorthStar Logistics  (manager: Meera Nair)  - 4 engineers, 4 projects

Each employee gets:
  - approved project assignments
  - punch in / punch out entries for the last 21 working days
  - daily time allocations split across assigned projects
  - daily timecard summary entries
  - work rules for weekly / daily hour limits
"""

from __future__ import annotations

import random
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from src.app.core.security import hash_password
from src.app.db.session import SessionLocal
from src.app.models.issue_report import IssueReport
from src.app.models.project import Project, ProjectStatus
from src.app.models.project_assignment import AssignmentStatus, ProjectAssignment
from src.app.models.punch_entry import PunchEntry
from src.app.models.role import Role
from src.app.models.tracking_category import TrackingCategory
from src.app.models.tracking_code import TrackingCode
from src.app.models.tracking_rule import TrackingRule
from src.app.models.time_allocation import TimeAllocation
from src.app.models.timecard import Timecard
from src.app.models.timecard_submission import TimecardSubmission
from src.app.models.user import User
from src.app.models.user_work_rule import UserWorkRule


def last_n_working_days(count: int) -> list[date]:
    days: list[date] = []
    current = date.today()
    while len(days) < count:
        if current.weekday() < 5:
            days.append(current)
        current -= timedelta(days=1)
    return list(reversed(days))


def dt(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=timezone.utc)


def week_start_datetime(day: date) -> datetime:
    monday = day - timedelta(days=day.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)


def clear_existing_data(db: Session) -> None:
    print("Clearing existing data...")
    for model in (
        IssueReport,
        TimecardSubmission,
        TimeAllocation,
        PunchEntry,
        ProjectAssignment,
        Timecard,
        TrackingRule,
        TrackingCode,
        TrackingCategory,
        UserWorkRule,
        Project,
        User,
        Role,
    ):
        db.query(model).delete()
    db.commit()
    print("Cleared existing rows")


def create_roles(db: Session) -> tuple[Role, Role]:
    manager = Role(
        name="manager",
        display_name="Manager",
        can_create_projects=True,
        can_manage_assignments=True,
        can_view_all_timecards=True,
        can_manage_users=True,
    )
    employee = Role(
        name="employee",
        display_name="Employee",
        can_create_projects=False,
        can_manage_assignments=False,
        can_view_all_timecards=False,
        can_manage_users=False,
    )
    db.add_all([manager, employee])
    db.commit()
    db.refresh(manager)
    db.refresh(employee)
    return manager, employee


def create_manager(db: Session, email: str, full_name: str, password: str, role_id: int) -> User:
    manager = User(
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        is_active=True,
        is_superuser=True,
        role_id=role_id,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)
    return manager


def create_employees(db: Session, employees_data: list[tuple[str, str, str]], role_id: int) -> list[User]:
    employees: list[User] = []
    for email, full_name, password in employees_data:
        employee = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            is_active=True,
            is_superuser=False,
            role_id=role_id,
        )
        db.add(employee)
        employees.append(employee)
    db.commit()
    for employee in employees:
        db.refresh(employee)
    return employees


def create_projects(
    db: Session,
    manager: User,
    company: str,
    projects_data: list[tuple[str, str, str, str, str]],
    start_base: datetime,
    no_approval_codes: list[str] | None = None,
) -> list[Project]:
    no_approval_codes = no_approval_codes or []
    projects: list[Project] = []
    for code, name, sub_code, department, description in projects_data:
        project = Project(
            code=code,
            name=name,
            sub_code=sub_code,
            department=department,
            description=description,
            company=company,
            creator_id=manager.id,
            supervisor_id=manager.id,
            status=ProjectStatus.ACTIVE,
            start_date=start_base,
            requires_approval=code not in no_approval_codes,
        )
        db.add(project)
        projects.append(project)
    db.commit()
    for project in projects:
        db.refresh(project)
    return projects


def assign_projects(
    db: Session,
    manager: User,
    assign_plan: list[tuple[User, list[tuple[Project, str]]]],
    approved_at: datetime,
) -> dict[int, list[Project]]:
    user_projects: dict[int, list[Project]] = {}
    for employee, project_roles in assign_plan:
        user_projects[employee.id] = []
        for project, role in project_roles:
            assignment = ProjectAssignment(
                user_id=employee.id,
                project_id=project.id,
                role=role,
                assigner_id=manager.id,
                status=AssignmentStatus.APPROVED,
                approved_by_id=manager.id,
                approved_at=approved_at,
                notes="Approved at project kick-off",
            )
            db.add(assignment)
            user_projects[employee.id].append(project)
    db.commit()
    return user_projects


def build_task_descriptions() -> dict[str, list[str]]:
    return {
        "TMS": [
            "Implemented punch-in/out REST endpoint",
            "Fixed JWT token refresh logic",
            "Added pagination to timecard list API",
            "Code review and PR feedback",
            "Wrote unit tests for auth service",
            "Database schema migration and indexing",
            "Implemented timecard submission workflow",
        ],
        "MOBILE": [
            "Built clock-in UI component",
            "Integrated REST API client",
            "Fixed offline sync bug with SQLite",
            "Wrote E2E tests for mobile flows",
            "Push notification setup and testing",
            "Gesture navigation implementation",
        ],
        "DBOPT": [
            "Analyzed slow query log",
            "Added composite index on punch_entries",
            "Rewrote N+1 ORM queries",
            "Query execution plan optimization",
            "Connection pool tuning",
        ],
        "APIDEV": [
            "Designed RESTful API endpoints",
            "Implemented OAuth2 authentication",
            "Built rate limiting middleware",
            "Wrote API documentation and examples",
            "Created postman collection for testing",
            "Implemented request validation schemas",
        ],
        "FRONTEND": [
            "Built dashboard components",
            "Implemented React Query for server state",
            "Created reusable UI component library",
            "Fixed responsive design issues",
            "Performance optimization for large tables",
            "Accessibility audit and WCAG compliance",
        ],
        "DEVOPS": [
            "Set up GitHub Actions CI/CD pipeline",
            "Dockerized application services",
            "Kubernetes deployment manifests",
            "Prometheus monitoring and alerting",
            "Database backup and recovery setup",
            "Terraform infrastructure as code",
        ],
        "TESTING": [
            "Wrote unit tests with pytest",
            "Implemented integration test suite",
            "E2E testing with Selenium/Cypress",
            "Test coverage analysis and reporting",
            "Load testing and stress testing",
            "Test automation framework improvements",
        ],
        "SECURITY": [
            "OWASP security checklist review",
            "SQL injection vulnerability scan",
            "Penetration testing results analysis",
            "Dependency vulnerability assessment",
            "CORS and CSP header hardening",
            "Secrets management implementation",
        ],
        "ANALYTICS": [
            "Built data ingestion pipeline",
            "Implemented event schema validation",
            "Created aggregation queries",
            "Performance tuning for big queries",
            "Real-time stream processing setup",
        ],
        "MLPIPE": [
            "Feature engineering pipeline development",
            "Model training infrastructure setup",
            "Hyperparameter tuning experiments",
            "Model evaluation and validation",
            "Production model serving API",
        ],
        "SPARK": [
            "Spark job optimization",
            "Distributed computing task tuning",
            "RDD to DataFrame migration",
            "Partitioning strategy implementation",
            "Shuffle optimization techniques",
        ],
        "DATASEC": [
            "Encryption algorithm implementation",
            "Role-based access control system",
            "Data classification framework",
            "Audit logging system",
            "Policy enforcement engine",
        ],
        "DATAOBS": [
            "Data quality metric definitions",
            "Anomaly detection algorithms",
            "Dashboard UI implementation",
            "Alert notification system",
            "Metadata collection framework",
        ],
        "ROUTING": [
            "Route optimization algorithm",
            "Graph traversal implementation",
            "Distance matrix calculation",
            "Real-time traffic integration",
            "API endpoint development",
        ],
        "TRACKING": [
            "GPS data ingestion system",
            "Geospatial indexing with PostGIS",
            "Real-time location streaming",
            "Historical tracking queries",
            "Map visualization API",
        ],
        "MOBILEAPP": [
            "Location tracking feature",
            "Offline-first architecture",
            "Navigation UI implementation",
            "Native module integration",
            "App performance optimization",
        ],
        "ANALYTICS": [
            "Analytics dashboard development",
            "Report generation system",
            "Data aggregation queries",
            "Performance metrics calculation",
            "Export functionality",
        ],
    }


def create_time_tracking_data(
    db: Session,
    working_days: list[date],
    all_employees: list[User],
    all_users_projects: dict[int, list[Project]],
    clean_user_ids: set[int] | None = None,
) -> tuple[int, int, int]:
    task_descriptions = build_task_descriptions()
    today = date.today()
    random.seed(42)
    clean_user_ids = clean_user_ids or set()

    punch_count = 0
    allocation_count = 0
    timecard_count = 0

    for employee in all_employees:
        projects_for_employee = all_users_projects[employee.id]
        task_cycle = {project.code: 0 for project in projects_for_employee}
        is_clean_demo_user = employee.id in clean_user_ids

        for idx, work_date in enumerate(working_days):
            if is_clean_demo_user:
                in_hour = 9
                in_minute = 0
                out_hour = 17
                out_minute = 0
                total_hours = 8.0
            else:
                in_hour = 9
                in_minute = random.choice([0, 5, 10, 15, 20])
                out_hour = random.choice([17, 18])
                out_minute = random.choice([0, 15, 30, 45])
                total_hours = (out_hour + out_minute / 60) - (in_hour + in_minute / 60)

            is_today = work_date == today
            punch_entry = PunchEntry(
                user_id=employee.id,
                date=work_date,
                punch_in=dt(work_date, in_hour, in_minute),
                punch_out=None if is_today and not is_clean_demo_user else dt(work_date, out_hour, out_minute),
                notes="Office" if is_clean_demo_user or idx % 3 != 0 else "WFH",
            )
            db.add(punch_entry)
            punch_count += 1

            if is_today and not is_clean_demo_user:
                continue

            if len(projects_for_employee) == 1:
                splits = [(projects_for_employee[0], round(total_hours, 1))]
            elif is_clean_demo_user:
                primary_hours = round(total_hours * 0.625, 1)
                secondary_hours = round(total_hours - primary_hours, 1)
                splits = [
                    (projects_for_employee[0], primary_hours),
                    (projects_for_employee[1], secondary_hours),
                ]
            else:
                primary_hours = round(total_hours * random.uniform(0.5, 0.7), 1)
                secondary_hours = round(total_hours - primary_hours, 1)
                if idx % 2 == 0:
                    splits = [
                        (projects_for_employee[0], primary_hours),
                        (projects_for_employee[1], secondary_hours),
                    ]
                else:
                    splits = [
                        (projects_for_employee[1], primary_hours),
                        (projects_for_employee[0], secondary_hours),
                    ]

            for project, hours in splits:
                if hours <= 0:
                    continue
                descriptions = task_descriptions.get(project.code, ["Development work"])
                description = descriptions[task_cycle[project.code] % len(descriptions)]
                task_cycle[project.code] += 1
                db.add(
                    TimeAllocation(
                        user_id=employee.id,
                        project_id=project.id,
                        date=work_date,
                        hours=hours,
                        description=description,
                    )
                )
                allocation_count += 1

            # Create one timecard per project split with cost_center matching tracking codes
            for project, hours in splits:
                if hours <= 0:
                    continue
                db.add(
                    Timecard(
                        user_id=employee.id,
                        project_id=project.id,
                        cost_center=project.code,
                        date=datetime(work_date.year, work_date.month, work_date.day, tzinfo=timezone.utc),
                        hours_worked=round(hours, 1),
                        description=f"Worked on {project.code}",
                        entry_type="work",
                    )
                )
                timecard_count += 1

        db.commit()

    return punch_count, allocation_count, timecard_count


def create_work_rules(db: Session, all_employees: list[User], working_days: list[date]) -> int:
    count = 0
    for idx, employee in enumerate(all_employees):
        target = 40.0 if idx % 3 else 42.5
        weekly_cap = 45.0 if idx % 2 == 0 else 48.0
        daily_cap = 9.0 if idx % 4 else 10.0

        db.add(
            UserWorkRule(
                user_id=employee.id,
                name="Default Weekly Schedule",
                target_weekly_hours=target,
                max_weekly_hours=weekly_cap,
                max_daily_hours=daily_cap,
                effective_from=working_days[0],
                priority=0,
                is_active=True,
                notes="Baseline weekly schedule seeded for demo usage",
            )
        )
        count += 1

        if idx % 2 == 0:
            db.add(
                UserWorkRule(
                    user_id=employee.id,
                    name="Peak Delivery Window",
                    target_weekly_hours=target + 2.0,
                    max_weekly_hours=weekly_cap + 2.0,
                    max_daily_hours=daily_cap,
                    effective_from=working_days[-5],
                    priority=1,
                    is_active=True,
                    notes="Temporary uplift rule for high-demand periods",
                )
            )
            count += 1

    db.commit()
    return count


def create_tracking_setup(db: Session, manager: User, projects: list[Project]) -> tuple[int, int, int]:
    category_count = 0
    code_count = 0
    rule_count = 0

    for index, project in enumerate(projects):
        category = TrackingCategory(
            name=f"{project.name} Tracking",
            description=f"Grouped tracking setup for {project.name}",
            company=project.company,
            project_id=project.id,
            creator_id=manager.id,
            is_active=True,
            sort_order=index,
        )
        db.add(category)
        db.flush()
        category_count += 1

        codes = [
            TrackingCode(
                category_id=category.id,
                label=project.name,
                code=project.code,
                description=f"Primary delivery code for {project.name}",
                entry_type="work",
                labor_category=project.department or "Delivery",
                extra_fields={
                    "classification": "Delivery",
                    "usage": "Primary delivery",
                    "required_field": "task_reference",
                },
                default_work_location="on_site",
                is_active=True,
                sort_order=0,
            ),
            TrackingCode(
                category_id=category.id,
                label=f"{project.name} Management And Reporting",
                code=f"{project.code}_PMR",
                description=f"Reporting, coordination, and planning for {project.name}",
                entry_type="work",
                labor_category="Project Management",
                extra_fields={
                    "classification": "Reporting",
                    "usage": "Management and reporting",
                    "required_field": "status_summary",
                },
                default_work_location="off_site",
                is_active=True,
                sort_order=1,
            ),
            TrackingCode(
                category_id=category.id,
                label=f"{project.name} Support",
                code=f"{project.code}_SUPPORT",
                description=f"Support and follow-up activities for {project.name}",
                entry_type="work",
                labor_category="Support",
                extra_fields={
                    "classification": "Support",
                    "usage": "Follow-up work",
                    "required_field": "ticket_reference",
                },
                default_work_location="off_site",
                is_active=True,
                sort_order=2,
            ),
        ]
        db.add_all(codes)
        code_count += len(codes)

        rules = [
            TrackingRule(
                category_id=category.id,
                name=f"{project.code} delivery defaults to on-site",
                scope_type="project",
                scope_value=project.code,
                condition_type="selected_code",
                condition_value=project.code,
                action_type="default_location",
                action_value="on_site",
                priority=0,
                is_active=True,
            ),
            TrackingRule(
                category_id=category.id,
                name=f"{project.code} management work should use PMR coding",
                scope_type="project",
                scope_value=project.code,
                condition_type="selected_code",
                condition_value=f"{project.code}_PMR",
                action_type="suggest_labor_category",
                action_value="Project Management",
                priority=1,
                is_active=True,
            ),
            TrackingRule(
                category_id=category.id,
                name=f"{project.code} support work requires a ticket reference",
                scope_type="project",
                scope_value=project.code,
                condition_type="selected_code",
                condition_value=f"{project.code}_SUPPORT",
                action_type="require_extra_field",
                action_value="ticket_reference",
                priority=2,
                is_active=True,
            ),
            TrackingRule(
                category_id=category.id,
                name=f"{project.code} support work defaults off-site",
                scope_type="project",
                scope_value=project.code,
                condition_type="selected_code",
                condition_value=f"{project.code}_SUPPORT",
                action_type="default_location",
                action_value="off_site",
                priority=3,
                is_active=True,
            ),
            TrackingRule(
                category_id=category.id,
                name="Show group for project team",
                scope_type="department",
                scope_value=project.department,
                condition_type="department",
                condition_value=project.department or "General",
                action_type="show_group",
                action_value=category.name,
                priority=4,
                is_active=True,
            ),
        ]
        db.add_all(rules)
        rule_count += len(rules)

    db.commit()
    return category_count, code_count, rule_count


def get_effective_rule_limits(db: Session, user_id: int, as_of_date: date) -> dict[str, object]:
    rules = db.query(UserWorkRule).filter(
        UserWorkRule.user_id == user_id,
        UserWorkRule.is_active == True,
        UserWorkRule.effective_from <= as_of_date,
    ).order_by(UserWorkRule.priority.asc(), UserWorkRule.effective_from.desc(), UserWorkRule.id.asc()).all()

    result: dict[str, object] = {
        "max_daily_hours": None,
        "max_weekly_hours": None,
        "applied_rule_names": [],
    }
    for rule in rules:
        result["applied_rule_names"].append(rule.name)
        if result["max_daily_hours"] is None and rule.max_daily_hours is not None:
            result["max_daily_hours"] = rule.max_daily_hours
        if result["max_weekly_hours"] is None and rule.max_weekly_hours is not None:
            result["max_weekly_hours"] = rule.max_weekly_hours
    return result


def create_issue_reports(
    db: Session,
    employee_manager_ids: dict[int, int],
    all_employees: list[User],
    excluded_user_ids: set[int] | None = None,
) -> int:
    employee_lookup = {employee.id: employee for employee in all_employees}
    excluded_user_ids = excluded_user_ids or set()
    timecards = db.query(Timecard).order_by(Timecard.user_id.asc(), Timecard.date.asc(), Timecard.id.asc()).all()
    timecards_by_user: dict[int, list[Timecard]] = defaultdict(list)
    for timecard in timecards:
        if timecard.user_id in excluded_user_ids:
            continue
        timecards_by_user[timecard.user_id].append(timecard)

    issues: list[IssueReport] = []
    now = datetime.now(timezone.utc)
    daily_candidates: list[dict[str, object]] = []
    weekly_candidates: list[dict[str, object]] = []

    for user_id, user_timecards in timecards_by_user.items():
        weekly_buckets: dict[date, list[Timecard]] = defaultdict(list)
        for timecard in user_timecards:
            work_day = timecard.date.date()
            limits = get_effective_rule_limits(db, user_id, work_day)
            max_daily_hours = limits["max_daily_hours"]
            if max_daily_hours is not None and timecard.hours_worked > float(max_daily_hours):
                daily_candidates.append(
                    {
                        "timecard": timecard,
                        "limit": float(max_daily_hours),
                        "rule_names": list(limits["applied_rule_names"]),
                    }
                )

            week_start = work_day - timedelta(days=work_day.weekday())
            weekly_buckets[week_start].append(timecard)

        for week_start, week_timecards in weekly_buckets.items():
            reference_day = max(item.date.date() for item in week_timecards)
            limits = get_effective_rule_limits(db, user_id, reference_day)
            max_weekly_hours = limits["max_weekly_hours"]
            weekly_total = round(sum(item.hours_worked for item in week_timecards), 1)
            if max_weekly_hours is not None and weekly_total > float(max_weekly_hours):
                weekly_candidates.append(
                    {
                        "timecards": week_timecards,
                        "limit": float(max_weekly_hours),
                        "total": weekly_total,
                        "rule_names": list(limits["applied_rule_names"]),
                    }
                )

    for index, candidate in enumerate(daily_candidates[:3]):
        timecard = candidate["timecard"]
        employee = employee_lookup[timecard.user_id]
        manager_id = employee_manager_ids[timecard.user_id]
        rule_names = candidate["rule_names"]
        issues.append(
            IssueReport(
                user_id=timecard.user_id,
                reporter_id=manager_id,
                timecard_id=timecard.id,
                issue_type="attendance",
                status="open" if index == 0 else ("in_review" if index == 1 else "resolved"),
                priority="high",
                title=f"Daily limit exceeded for {employee.full_name}",
                description=(
                    f"{employee.full_name} logged {timecard.hours_worked:.1f}h on {timecard.date.date().isoformat()}, "
                    f"which exceeds the active daily limit of {candidate['limit']:.1f}h. "
                    f"Applied rules: {', '.join(rule_names) or 'none'}."
                ),
                week_start=week_start_datetime(timecard.date.date()),
                resolution_notes=(
                    "Manager approved the overage because of a release deployment window."
                    if index == 2
                    else None
                ),
                resolved_by_id=manager_id if index == 2 else None,
                resolved_at=now - timedelta(days=1) if index == 2 else None,
            )
        )

    for index, candidate in enumerate(weekly_candidates[:3]):
        week_timecards = candidate["timecards"]
        anchor_timecard = week_timecards[-1]
        employee = employee_lookup[anchor_timecard.user_id]
        manager_id = employee_manager_ids[anchor_timecard.user_id]
        issues.append(
            IssueReport(
                user_id=anchor_timecard.user_id,
                reporter_id=manager_id,
                timecard_id=anchor_timecard.id,
                issue_type="timecard",
                status="in_review" if index == 0 else ("open" if index == 1 else "resolved"),
                priority="high" if index < 2 else "medium",
                title=f"Weekly cap exceeded for week of {candidate['timecards'][0].date.date().isoformat()}",
                description=(
                    f"{employee.full_name} submitted {candidate['total']:.1f}h for the week starting "
                    f"{week_timecards[0].date.date().isoformat()}, exceeding the weekly limit of {candidate['limit']:.1f}h. "
                    f"Review overtime approval and confirm whether the uplift was planned."
                ),
                week_start=week_start_datetime(week_timecards[0].date.date()),
                notice_subject=(
                    "Weekly overtime review required" if index == 0 else None
                ),
                notice_message=(
                    "Please confirm the release or support reason for the overtime hours logged this week."
                    if index == 0
                    else None
                ),
                resolution_notes=(
                    "Reviewed with delivery lead; overtime matched the temporary uplift schedule."
                    if index == 2
                    else None
                ),
                resolved_by_id=manager_id if index == 2 else None,
                resolved_at=now - timedelta(days=2) if index == 2 else None,
            )
        )

    distinct_projects: set[str] = set()
    project_timecards: list[Timecard] = []
    for timecard in timecards:
        if timecard.project is None or timecard.project.code in distinct_projects:
            continue
        distinct_projects.add(timecard.project.code)
        project_timecards.append(timecard)
        if len(project_timecards) == 3:
            break

    for index, timecard in enumerate(project_timecards):
        employee = employee_lookup[timecard.user_id]
        manager_id = employee_manager_ids[timecard.user_id]
        support_code = f"{timecard.project.code}_SUPPORT"
        pmr_code = f"{timecard.project.code}_PMR"
        if index == 0:
            title = f"{timecard.project.code} support work should use {support_code}"
            description = (
                f"{employee.full_name} logged follow-up work against the primary {timecard.project.code} delivery bucket. "
                f"Incident resolution and customer support work for {timecard.project.name} should be tracked under "
                f"{support_code} so support effort stays separated from delivery hours."
            )
            status = "open"
            priority = "medium"
            issue_type = "project"
        elif index == 1:
            title = f"{timecard.project.code} reporting should use {pmr_code}"
            description = (
                f"Planning, reporting, and stakeholder coordination for {timecard.project.name} should be recorded with "
                f"{pmr_code}. This timecard should be reviewed to confirm whether the hours belong in the management and "
                f"reporting code instead of the primary delivery code."
            )
            status = "in_review"
            priority = "medium"
            issue_type = "project"
        else:
            title = f"{timecard.project.code} support entries need ticket reference"
            description = (
                f"The tracking rule for {support_code} requires a ticket_reference value for auditability. Review related "
                f"support activity on {timecard.project.name} and capture the missing reference before payroll approval."
            )
            status = "resolved"
            priority = "low"
            issue_type = "other"

        issues.append(
            IssueReport(
                user_id=timecard.user_id,
                reporter_id=manager_id,
                timecard_id=timecard.id,
                issue_type=issue_type,
                status=status,
                priority=priority,
                title=title,
                description=description,
                week_start=week_start_datetime(timecard.date.date()),
                resolution_notes=(
                    "Tracking code corrected and supporting reference attached."
                    if status == "resolved"
                    else None
                ),
                resolved_by_id=manager_id if status == "resolved" else None,
                resolved_at=now - timedelta(hours=12) if status == "resolved" else None,
            )
        )

    db.add_all(issues)
    db.commit()
    return len(issues)


def create_timecard_submissions(
    db: Session,
    all_employees: list[User],
    working_days: list[date],
    excluded_user_ids: set[int] | None = None,
) -> int:
    """Create weekly timecard submissions for past completed weeks.

    - Fully past weeks → 'submitted' (with auto_approve_at 48h after submission)
    - The second-most-recent past week for every other employee → 'on_hold'
    - Current week and clean demo users → left as draft (no submission record)
    """
    excluded_user_ids = excluded_user_ids or set()
    now = datetime.now(timezone.utc)
    today = date.today()
    current_week_monday = today - timedelta(days=today.weekday())

    # Collect distinct week-start Mondays from working_days, excluding current week
    week_mondays: list[date] = sorted(
        {day - timedelta(days=day.weekday()) for day in working_days if day - timedelta(days=day.weekday()) < current_week_monday}
    )

    count = 0
    for employee in all_employees:
        if employee.id in excluded_user_ids:
            continue
        for idx, monday in enumerate(week_mondays):
            sunday = monday + timedelta(days=6)
            ws = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)
            we = datetime(sunday.year, sunday.month, sunday.day, 23, 59, 59, tzinfo=timezone.utc)
            submitted_at = datetime(monday.year, monday.month, monday.day, 18, 0, tzinfo=timezone.utc) + timedelta(days=4)

            # Make the second-most-recent week 'on_hold' for every other employee
            is_on_hold = idx == len(week_mondays) - 1 and employee.id % 2 == 0

            submission = TimecardSubmission(
                user_id=employee.id,
                week_start=ws,
                week_end=we,
                status="on_hold" if is_on_hold else "submitted",
                submitted_at=submitted_at,
                auto_approve_at=submitted_at + timedelta(hours=48) if not is_on_hold else None,
                review_notes="Held for manager review — verify overtime entries." if is_on_hold else None,
            )
            db.add(submission)
            count += 1

    db.commit()
    return count


def seed_data() -> None:
    db: Session = SessionLocal()

    try:
        print("=" * 70)
        print("SEEDING DATABASE - expanded sample data")
        print("=" * 70)

        if db.query(User).first():
            clear_existing_data(db)

        working_days = last_n_working_days(21)
        start_base = datetime.now(timezone.utc) - timedelta(days=60)
        approval_at = datetime.now(timezone.utc) - timedelta(days=45)

        role_manager, role_employee = create_roles(db)

        tech_manager = create_manager(db, "sunil@techcorp.com", "Sunil Kumar", "sunil123", role_manager.id)
        tech_employees = create_employees(
            db,
            [
                ("sandeep@techcorp.com", "Sai Sandeep Ramavath", "sandeep123"),
                ("nithikesh@techcorp.com", "Nithikesh Reddy", "nithikesh123"),
                ("sumeeth@techcorp.com", "Sumeeth Goud", "sumeeth123"),
                ("jatin@techcorp.com", "Jatin Sharma", "jatin123"),
                ("aditya@techcorp.com", "Aditya Verma", "aditya123"),
                ("pooja@techcorp.com", "Pooja Malhotra", "pooja123"),
                ("vikram@techcorp.com", "Vikram Desai", "vikram123"),
            ],
            role_employee.id,
        )
        tech_projects = create_projects(
            db,
            tech_manager,
            "TechCorp Solutions",
            [
                ("TMS", "Timecard Management System", "technical-development", "Engineering", "Full-stack time-tracking platform with REST API, database layer, and React frontend"),
                ("MOBILE", "Mobile App Development", "technical-development", "Engineering", "Cross-platform mobile client for field employees using React Native"),
                ("DBOPT", "Database Optimization", "infrastructure", "Infrastructure", "Query tuning, index optimization strategy, and migration tooling for SQLAlchemy ORM"),
                ("APIDEV", "REST API Framework", "technical-development", "Backend Engineering", "RESTful API design, authentication, authorization, and integration testing"),
                ("FRONTEND", "React Frontend Framework", "technical-development", "Frontend Engineering", "Component library, state management, UI/UX design, and performance optimization"),
                ("DEVOPS", "DevOps & Infrastructure", "infrastructure", "Infrastructure", "CI/CD pipelines, Docker containerization, Kubernetes orchestration, and monitoring"),
                ("TESTING", "Quality Assurance", "testing", "QA Engineering", "Unit testing, integration testing, E2E testing, and test automation frameworks"),
                ("SECURITY", "Security & Hardening", "security", "Security Engineering", "Penetration testing, vulnerability scanning, and security best practices implementation"),
            ],
            start_base,
            no_approval_codes=["TMS", "FRONTEND", "APIDEV"],
        )
        tech_user_projects = assign_projects(
            db,
            tech_manager,
            [
                (tech_employees[0], [(tech_projects[0], "Backend Developer"), (tech_projects[3], "API Architect")]),
                (tech_employees[1], [(tech_projects[1], "Mobile Developer"), (tech_projects[4], "Frontend Engineer")]),
                (tech_employees[2], [(tech_projects[4], "React Developer"), (tech_projects[6], "QA Engineer")]),
                (tech_employees[3], [(tech_projects[7], "Security Engineer"), (tech_projects[5], "DevOps Engineer")]),
                (tech_employees[4], [(tech_projects[2], "Database Developer"), (tech_projects[3], "Backend Engineer")]),
                (tech_employees[5], [(tech_projects[5], "Infrastructure Engineer"), (tech_projects[0], "Full Stack Developer")]),
                (tech_employees[6], [(tech_projects[6], "QA Lead"), (tech_projects[4], "UI Developer")]),
            ],
            approval_at,
        )

        dataflow_manager = create_manager(db, "priya@dataflow.com", "Priya Sharma", "priya123", role_manager.id)
        dataflow_employees = create_employees(
            db,
            [
                ("rahul@dataflow.com", "Rahul Mehta", "rahul123"),
                ("neha@dataflow.com", "Neha Joshi", "neha123"),
                ("arjun@dataflow.com", "Arjun Patel", "arjun123"),
                ("kavya@dataflow.com", "Kavya Reddy", "kavya123"),
                ("isha@dataflow.com", "Isha Kapoor", "isha123"),
                ("manav@dataflow.com", "Manav Bhatia", "manav123"),
            ],
            role_employee.id,
        )
        dataflow_projects = create_projects(
            db,
            dataflow_manager,
            "DataFlow Inc",
            [
                ("ANALYTICS", "Analytics Data Platform", "technical-development", "Data Engineering", "Real-time event ingestion, aggregation, and OLAP query engine development"),
                ("MLPIPE", "ML Pipeline Framework", "technical-development", "Data Science", "Feature engineering libraries, model training infrastructure, and model serving API"),
                ("SPARK", "Apache Spark Optimization", "infrastructure", "Data Infrastructure", "Distributed computing optimization, spark tuning, and cluster management"),
                ("DATASEC", "Data Security Framework", "security", "Security Engineering", "Data encryption, access control, and compliance enforcement system"),
                ("DATAOBS", "Data Observability Platform", "monitoring", "Platform Engineering", "Data quality metrics, anomaly detection, and operational dashboards"),
            ],
            start_base,
            no_approval_codes=["ANALYTICS", "SPARK"],
        )
        dataflow_user_projects = assign_projects(
            db,
            dataflow_manager,
            [
                (dataflow_employees[0], [(dataflow_projects[0], "Data Engineer"), (dataflow_projects[1], "ML Engineer")]),
                (dataflow_employees[1], [(dataflow_projects[1], "ML Developer"), (dataflow_projects[2], "Spark Engineer")]),
                (dataflow_employees[2], [(dataflow_projects[0], "Backend Engineer"), (dataflow_projects[4], "Dashboard Developer")]),
                (dataflow_employees[3], [(dataflow_projects[0], "Data Analyst"), (dataflow_projects[1], "Data Scientist")]),
                (dataflow_employees[4], [(dataflow_projects[3], "Security Engineer"), (dataflow_projects[4], "Monitoring Engineer")]),
                (dataflow_employees[5], [(dataflow_projects[2], "Infrastructure Engineer"), (dataflow_projects[0], "Pipeline Engineer")]),
            ],
            approval_at,
        )

        northstar_manager = create_manager(db, "meera@northstar.com", "Meera Nair", "meera123", role_manager.id)
        northstar_employees = create_employees(
            db,
            [
                ("rohan@northstar.com", "Rohan Iyer", "rohan123"),
                ("anika@northstar.com", "Anika Sen", "anika123"),
                ("dev@northstar.com", "Dev Khanna", "dev123"),
                ("tara@northstar.com", "Tara Menon", "tara123"),
            ],
            role_employee.id,
        )
        northstar_projects = create_projects(
            db,
            northstar_manager,
            "NorthStar Logistics",
            [
                ("ROUTING", "Routing Engine", "technical-development", "Backend Engineering", "Graph-based route optimization algorithm and dispatch optimization system"),
                ("TRACKING", "GPS Tracking System", "technical-development", "Backend Engineering", "Real-time GPS data ingestion, processing, and geospatial queries"),
                ("MOBILEAPP", "Mobile Fleet App", "technical-development", "Mobile Engineering", "Cross-platform mobile app for drivers with offline capabilities"),
                ("LOGANALYTICS", "Logistics Analytics", "reporting", "Data Engineering", "Analytics dashboards for fleet insights and performance reporting"),
            ],
            start_base,
            no_approval_codes=["ROUTING"],
        )
        northstar_user_projects = assign_projects(
            db,
            northstar_manager,
            [
                (northstar_employees[0], [(northstar_projects[0], "Backend Engineer"), (northstar_projects[1], "Geospatial Engineer")]),
                (northstar_employees[1], [(northstar_projects[2], "Mobile Developer"), (northstar_projects[0], "Algorithm Engineer")]),
                (northstar_employees[2], [(northstar_projects[1], "Full Stack Developer"), (northstar_projects[2], "Frontend Developer")]),
                (northstar_employees[3], [(northstar_projects[3], "Analytics Engineer"), (northstar_projects[2], "QA Engineer")]),
            ],
            approval_at,
        )

        all_employees = tech_employees + dataflow_employees  # + northstar_employees
        all_user_projects = {
            **tech_user_projects,
            **dataflow_user_projects,
            # **northstar_user_projects,
        }
        clean_demo_user = tech_employees[0]
        clean_demo_user_ids = {clean_demo_user.id}

        punch_count, allocation_count, timecard_count = create_time_tracking_data(
            db, working_days, all_employees, all_user_projects, clean_user_ids=clean_demo_user_ids
        )
        rule_count = create_work_rules(db, all_employees, working_days)
        tracking_category_count, tracking_code_count, tracking_rule_count = create_tracking_setup(
            db,
            tech_manager,
            tech_projects,
        )
        df_category_count, df_code_count, df_rule_count = create_tracking_setup(
            db,
            dataflow_manager,
            dataflow_projects,
        )
        # ns_category_count, ns_code_count, ns_rule_count = create_tracking_setup(
        #     db,
        #     northstar_manager,
        #     northstar_projects,
        # )

        tracking_category_count += df_category_count  # + ns_category_count
        tracking_code_count += df_code_count  # + ns_code_count
        tracking_rule_count += df_rule_count  # + ns_rule_count
        employee_manager_ids = {
            **{employee.id: tech_manager.id for employee in tech_employees},
            **{employee.id: dataflow_manager.id for employee in dataflow_employees},
            # **{employee.id: northstar_manager.id for employee in northstar_employees},
        }
        issue_report_count = create_issue_reports(
            db,
            employee_manager_ids=employee_manager_ids,
            all_employees=all_employees,
            excluded_user_ids=clean_demo_user_ids,
        )
        submission_count = create_timecard_submissions(
            db,
            all_employees=all_employees,
            working_days=working_days,
            excluded_user_ids=clean_demo_user_ids,
        )

        # ── Demo assignment requests (pending / rejected) ────────────────
        # Cross-company requests: employees requesting to join projects they're not on
        demo_requests: list[ProjectAssignment] = []
        # TechCorp employees requesting to join projects they aren't on
        demo_requests.append(ProjectAssignment(
            user_id=tech_employees[0].id,  # Sandeep
            project_id=tech_projects[2].id,  # DBOPT
            role="Full Stack Developer",
            assigner_id=tech_employees[0].id,
            status=AssignmentStatus.PENDING,
            notes="Would love to contribute to the DBOPT project",
        ))
        demo_requests.append(ProjectAssignment(
            user_id=tech_employees[1].id,  # Nithikesh
            project_id=tech_projects[6].id,  # TESTING
            role="QA Engineer",
            assigner_id=tech_employees[1].id,
            status=AssignmentStatus.PENDING,
            notes="Interested in quality assurance and testing work",
        ))
        demo_requests.append(ProjectAssignment(
            user_id=tech_employees[2].id,  # Sumeeth
            project_id=tech_projects[7].id,  # SECURITY
            role="Security Tester",
            assigner_id=tech_employees[2].id,
            status=AssignmentStatus.PENDING,
            notes="Want to gain security audit experience",
        ))
        # A rejected request
        demo_requests.append(ProjectAssignment(
            user_id=tech_employees[3].id,  # Jatin
            project_id=tech_projects[5].id,  # DEVOPS
            role="DevOps Engineer",
            assigner_id=tech_employees[3].id,
            status=AssignmentStatus.REJECTED,
            approved_by_id=tech_manager.id,
            approved_at=approval_at,
            notes="Team is at capacity right now",
        ))
        for req in demo_requests:
            db.add(req)
        db.commit()
        demo_request_count = len(demo_requests)

        total_projects = len(tech_projects) + len(dataflow_projects)  # + len(northstar_projects)
        total_assignments = sum(len(projects) for projects in all_user_projects.values())

        print()
        print("=" * 70)
        print("DATABASE SEEDED SUCCESSFULLY")
        print("=" * 70)
        print(f"Companies: 2")
        print(f"Managers: 2")
        print(f"Employees: {len(all_employees)}")
        print(f"Projects: {total_projects}")
        print(f"Assignments: {total_assignments}")
        print(f"Punch entries: {punch_count}")
        print(f"Time allocations: {allocation_count}")
        print(f"Timecards: {timecard_count}")
        print(f"Work rules: {rule_count}")
        print(f"Tracking categories: {tracking_category_count}")
        print(f"Tracking codes: {tracking_code_count}")
        print(f"Tracking rules: {tracking_rule_count}")
        print(f"Issue reports: {issue_report_count}")
        print(f"Timecard submissions: {submission_count}")
        print(f"Demo assignment requests: {demo_request_count}")
        print()
        print("Manager logins:")
        print("  sunil@techcorp.com / sunil123")
        print("  priya@dataflow.com / priya123")
        # print("  meera@northstar.com / meera123")
        print()
        print("Clean demo user (draft week, no seeded alerts):")
        print(f"  {clean_demo_user.email} / sandeep123")

    except Exception as exc:
        print(f"\nSeed failed: {exc}")
        import traceback

        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
