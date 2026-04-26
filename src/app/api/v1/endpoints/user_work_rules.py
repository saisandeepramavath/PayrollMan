"""
User work rule endpoints.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from src.app.api.deps import require_permission, get_current_user
from src.app.db.session import get_db
from src.app.schemas.user_work_rule import (
    UserEffectiveWorkRule,
    UserWorkRuleCreate,
    UserWorkRuleReorderRequest,
    UserWorkRuleResponse,
    UserWorkRuleUpdate,
)
from src.app.services.user_work_rule_service import UserWorkRuleService

router = APIRouter()


@router.get("/users/{user_id}", response_model=List[UserWorkRuleResponse])
def list_user_rules(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_manage_users")),
):
    return UserWorkRuleService.list_rules(db, user_id)


@router.get("/users/{user_id}/effective", response_model=UserEffectiveWorkRule)
def get_effective_rule(
    user_id: int,
    as_of_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if user_id != current_user.id:
        role = current_user.role
        can_view_other = current_user.is_superuser or getattr(role, "can_manage_users", False) or getattr(role, "can_view_all_timecards", False)
        if not can_view_other:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: you cannot view rules for another user"
            )
    return UserWorkRuleService.get_effective_rule(db, user_id, as_of_date)


@router.post("/", response_model=UserWorkRuleResponse, status_code=status.HTTP_201_CREATED)
def create_rule(
    rule_data: UserWorkRuleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_manage_users")),
):
    return UserWorkRuleService.create_rule(db, rule_data)


@router.put("/{rule_id}", response_model=UserWorkRuleResponse)
def update_rule(
    rule_id: int,
    rule_data: UserWorkRuleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_manage_users")),
):
    return UserWorkRuleService.update_rule(db, rule_id, rule_data)


@router.put("/users/{user_id}/reorder", response_model=List[UserWorkRuleResponse])
def reorder_rules(
    user_id: int,
    reorder_request: UserWorkRuleReorderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_manage_users")),
):
    return UserWorkRuleService.reorder_rules(db, user_id, reorder_request)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_permission("can_manage_users")),
):
    UserWorkRuleService.delete_rule(db, rule_id)
    return None