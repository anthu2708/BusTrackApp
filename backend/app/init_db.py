from database import Base
from database import engine  # hoặc nơi bạn tạo `engine`

# Tạo toàn bộ bảng đã định nghĩa
Base.metadata.create_all(bind=engine)
print("✅ Tables created successfully")
