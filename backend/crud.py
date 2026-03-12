def get_user_plans(db: Session, user_id: int):
    return (
        db.query(Plan)
        .filter(Plan.user_id == user_id)
        .order_by(Plan.created_at.desc())
        .all()
    )
