"""Tracking repository."""

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from src.app.models.tracking_category import TrackingCategory
from src.app.models.tracking_code import TrackingCode
from src.app.models.tracking_rule import TrackingRule


class TrackingRepository:
    """Data access for tracking configuration."""

    @staticmethod
    def create_category(db: Session, **kwargs) -> TrackingCategory:
        category = TrackingCategory(**kwargs)
        db.add(category)
        db.flush()
        return category

    @staticmethod
    def create_code(db: Session, **kwargs) -> TrackingCode:
        code = TrackingCode(**kwargs)
        db.add(code)
        return code

    @staticmethod
    def create_rule(db: Session, **kwargs) -> TrackingRule:
        rule = TrackingRule(**kwargs)
        db.add(rule)
        return rule

    @staticmethod
    def get_category(db: Session, category_id: int) -> Optional[TrackingCategory]:
        return db.query(TrackingCategory).options(
            joinedload(TrackingCategory.codes),
            joinedload(TrackingCategory.rules),
        ).filter(TrackingCategory.id == category_id).first()

    @staticmethod
    def list_categories(
        db: Session,
        project_id: Optional[int] = None,
        company: Optional[str] = None,
        assigned_project_ids: Optional[list[int]] = None,
    ) -> list[TrackingCategory]:
        query = db.query(TrackingCategory).options(
            joinedload(TrackingCategory.codes),
            joinedload(TrackingCategory.rules),
        )
        if project_id is not None:
            query = query.filter(TrackingCategory.project_id == project_id)
        if company:
            query = query.filter(TrackingCategory.company == company)
        if assigned_project_ids is not None:
            query = query.filter(TrackingCategory.project_id.in_(assigned_project_ids))
        return query.order_by(TrackingCategory.sort_order.asc(), TrackingCategory.created_at.asc()).all()

    @staticmethod
    def delete_codes_for_category(db: Session, category_id: int) -> None:
        db.query(TrackingCode).filter(TrackingCode.category_id == category_id).delete()

    @staticmethod
    def delete_rules_for_category(db: Session, category_id: int) -> None:
        db.query(TrackingRule).filter(TrackingRule.category_id == category_id).delete()