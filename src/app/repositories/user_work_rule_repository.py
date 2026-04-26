"""
User work rule repository.
"""

from datetime import date
from typing import List, Optional

from sqlalchemy.orm import Session

from src.app.models.user_work_rule import UserWorkRule


class UserWorkRuleRepository:
    """Data access for user work rules."""

    @staticmethod
    def get_by_id(db: Session, rule_id: int) -> Optional[UserWorkRule]:
        return db.query(UserWorkRule).filter(UserWorkRule.id == rule_id).first()

    @staticmethod
    def get_by_user(db: Session, user_id: int) -> List[UserWorkRule]:
        return db.query(UserWorkRule).filter(
            UserWorkRule.user_id == user_id
        ).order_by(UserWorkRule.priority.asc(), UserWorkRule.effective_from.desc(), UserWorkRule.id.asc()).all()

    @staticmethod
    def get_effective_rules(db: Session, user_id: int, as_of_date: date) -> List[UserWorkRule]:
        return db.query(UserWorkRule).filter(
            UserWorkRule.user_id == user_id,
            UserWorkRule.is_active == True,
            UserWorkRule.effective_from <= as_of_date,
        ).order_by(UserWorkRule.priority.asc(), UserWorkRule.effective_from.desc(), UserWorkRule.id.asc()).all()

    @staticmethod
    def create(db: Session, **kwargs) -> UserWorkRule:
        rule = UserWorkRule(**kwargs)
        db.add(rule)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def update(db: Session, rule: UserWorkRule, **kwargs) -> UserWorkRule:
        for key, value in kwargs.items():
            if value is not None and hasattr(rule, key):
                setattr(rule, key, value)
        db.commit()
        db.refresh(rule)
        return rule

    @staticmethod
    def delete(db: Session, rule: UserWorkRule) -> None:
        db.delete(rule)
        db.commit()

    @staticmethod
    def reorder(db: Session, user_id: int, items: list[tuple[int, int]]) -> List[UserWorkRule]:
        rules = db.query(UserWorkRule).filter(UserWorkRule.user_id == user_id).all()
        priority_map = {rule_id: priority for rule_id, priority in items}
        for rule in rules:
            if rule.id in priority_map:
                rule.priority = priority_map[rule.id]
        db.commit()
        return UserWorkRuleRepository.get_by_user(db, user_id)