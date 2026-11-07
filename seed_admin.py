import asyncio
from app.database import get_mongodb
from app.services.auth import AuthService, UserCreate, UserRole

async def main():
    mongodb = await get_mongodb()
    auth_service = AuthService(mongodb)
    
    email = "cobacteamtr@gmail.com"
    password = "2026@cobac."
    name = "Admin"
    
    user_data = UserCreate(email=email, password=password, name=name)
    user = await auth_service.create_user(user_data, role=UserRole.ADMIN)
    
    if user:
        print(f"✅ Successfully created Admin user: {email}")
    else:
        print(f"⚠️ User {email} already exists!")

if __name__ == "__main__":
    asyncio.run(main())
