"""
User work rule service.
"""

from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.app.repositories.user_repository import UserRepository
from src.app.repositories.user_work_rule_repository import UserWorkRuleRepository
from src.app.schemas.user_work_rule import (
    UserEffectiveWorkRule,
    UserWorkRuleCreate,
    UserWorkRuleReorderRequest,
    UserWorkRuleUpdate,
)


class UserWorkRuleService:
    """Business logic for user work rules."""

    @staticmethod
    def _validate_user(db: Session, user_id: int):
        user = UserRepository.get_by_id(db=db, user_id=user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    @staticmethod
    def create_rule(db: Session, rule_data: UserWorkRuleCreate):
        UserWorkRuleService._validate_user(db, rule_data.user_id)
        return UserWorkRuleRepository.create(db, **rule_data.model_dump())

    @staticmethod
    def list_rules(db: Session, user_id: int):
        UserWorkRuleService._validate_user(db, user_id)
        return UserWorkRuleRepository.get_by_user(db, user_id)

    @staticmethod
    def update_rule(db: Session, rule_id: int, rule_data: UserWorkRuleUpdate):
        rule = UserWorkRuleRepository.get_by_id(db, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work rule not found")
        payload = rule_data.model_dump(exclude_unset=True)
        return UserWorkRuleRepository.update(db, rule, **payload)

    @staticmethod
    def delete_rule(db: Session, rule_id: int):
        rule = UserWorkRuleRepository.get_by_id(db, rule_id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work rule not found")
        UserWorkRuleRepository.delete(db, rule)

    @staticmethod
    def reorder_rules(db: Session, user_id: int, reorder_request: UserWorkRuleReorderRequest):
        UserWorkRuleService._validate_user(db, user_id)
        items = [(item.id, item.priority) for item in reorder_request.items]
        return UserWorkRuleRepository.reorder(db, user_id, items)

    @staticmethod
    def get_effective_rule(db: Session, user_id: int, as_of_date: Optional[date] = None) -> UserEffectiveWorkRule:
        as_of_date = as_of_date or date.today()
        UserWorkRuleService._validate_user(db, user_id)
        rules = UserWorkRuleRepository.get_effective_rules(db, user_id, as_of_date)

        result = UserEffectiveWorkRule(user_id=user_id, as_of_date=as_of_date, applied_rule_names=[])
        for rule in rules:
            result.applied_rule_names.append(rule.name)
            if result.target_weekly_hours is None and rule.target_weekly_hours is not None:
                result.target_weekly_hours = rule.target_weekly_hours
            if result.max_weekly_hours is None and rule.max_weekly_hours is not None:
                result.max_weekly_hours = rule.max_weekly_hours
            if result.max_daily_hours is None and rule.max_daily_hours is not None:
                result.max_daily_hours = rule.max_daily_hours
        return result