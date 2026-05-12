import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
from typing import Optional

from app.db.engine import init_db
from app.models.user import User

async def check_users():
    await init_db()
    users = await User.find_all().to_list()
    print("--- User List ---")
    for u in users:
        print(f"Email: {u.email} | Hash: {u.hashed_password} | Admin: {u.is_superuser}")
    print("-----------------")

if __name__ == "__main__":
    asyncio.run(check_users())
