"""Tracking service."""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.app.models.project import Project
from src.app.repositories.project_repository import ProjectRepository
from src.app.repositories.tracking_repository import TrackingRepository
from src.app.schemas.tracking import TrackingCategoryCreate, TrackingCategoryUpdate


class TrackingService:
    """Business logic for tracking categories, codes, and rules."""

    @staticmethod
    def create_category(
        db: Session,
        creator_id: int,
        category_data: TrackingCategoryCreate,
        project_id: Optional[int] = None,
    ):
        target_project_id = project_id if project_id is not None else category_data.project_id
        if target_project_id is not None:
            project = ProjectRepository.get_by_id(db=db, project_id=target_project_id)
            if not project:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found for tracking category")
        category = TrackingRepository.create_category(
            db=db,
            creator_id=creator_id,
            name=category_data.name,
            description=category_data.description,
            company=category_data.company,
            is_active=category_data.is_active,
            sort_order=category_data.sort_order,
            project_id=target_project_id,
        )

        for index, code in enumerate(category_data.codes):
            TrackingRepository.create_code(
                db=db,
                category_id=category.id,
                label=code.label,
                code=code.code,
                description=code.description,
                entry_type=code.entry_type,
                labor_category=code.labor_category,
                extra_fields=code.extra_fields,
                default_work_location=code.default_work_location,
                is_active=code.is_active,
                sort_order=code.sort_order if code.sort_order is not None else index,
            )

        for index, rule in enumerate(category_data.rules):
            TrackingRepository.create_rule(
                db=db,
                category_id=category.id,
                name=rule.name,
                scope_type=rule.scope_type,
                scope_value=rule.scope_value,
                condition_type=rule.condition_type,
                condition_value=rule.condition_value,
                action_type=rule.action_type,
                action_value=rule.action_value,
                priority=rule.priority if rule.priority is not None else index,
                is_active=rule.is_active,
            )

        db.commit()
        return TrackingRepository.get_category(db=db, category_id=category.id)

    @staticmethod
    def list_categories(
        db: Session,
        project_id: Optional[int] = None,
        company: Optional[str] = None,
        assigned_only: bool = False,
        user_id: Optional[int] = None,
    ):
        assigned_project_ids = None
        if assigned_only and user_id is not None:
            from src.app.models.project_assignment import ProjectAssignment, AssignmentStatus
            rows = (
                db.query(ProjectAssignment.project_id)
                .filter(
                    ProjectAssignment.user_id == user_id,
                    ProjectAssignment.status == AssignmentStatus.APPROVED,
                )
                .all()
            )
            assigned_project_ids = [r[0] for r in rows]
        return TrackingRepository.list_categories(
            db=db, project_id=project_id, company=company,
            assigned_project_ids=assigned_project_ids,
        )

    @staticmethod
    def get_category(db: Session, category_id: int):
        category = TrackingRepository.get_category(db=db, category_id=category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracking category not found")
        return category

    @staticmethod
    def update_category(
        db: Session,
        category_id: int,
        category_data: TrackingCategoryUpdate,
    ):
        category = TrackingRepository.get_category(db=db, category_id=category_id)
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tracking category not found")

        payload = category_data.model_dump(exclude_unset=True)
        codes = payload.pop("codes", None)
        rules = payload.pop("rules", None)

        for key, value in payload.items():
            setattr(category, key, value)

        if codes is not None:
            TrackingRepository.delete_codes_for_category(db=db, category_id=category.id)
            for index, code in enumerate(codes):
                TrackingRepository.create_code(
                    db=db,
                    category_id=category.id,
                    label=code.label,
                    code=code.code,
                    description=code.description,
                    entry_type=code.entry_type,
                    labor_category=code.labor_category,
                    extra_fields=code.extra_fields,
                    default_work_location=code.default_work_location,
                    is_active=code.is_active,
                    sort_order=code.sort_order if code.sort_order is not None else index,
                )

        if rules is not None:
            TrackingRepository.delete_rules_for_category(db=db, category_id=category.id)
            for index, rule in enumerate(rules):
                TrackingRepository.create_rule(
                    db=db,
                    category_id=category.id,
                    name=rule.name,
                    scope_type=rule.scope_type,
                    scope_value=rule.scope_value,
                    condition_type=rule.condition_type,
                    condition_value=rule.condition_value,
                    action_type=rule.action_type,
                    action_value=rule.action_value,
                    priority=rule.priority if rule.priority is not None else index,
                    is_active=rule.is_active,
                )

        db.commit()
        return TrackingRepository.get_category(db=db, category_id=category.id)