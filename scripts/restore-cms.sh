#!/bin/bash
# FEDZX CMS 数据库恢复脚本

set -e

# 配置
DB_PATH="/opt/fedzx/apps/cms/prod.db"
BACKUP_DIR="/opt/fedzx/backups/cms"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========== FEDZX CMS 数据库恢复工具 ==========${NC}"
echo

# 检查是否传入了备份文件参数
if [ -z "$1" ]; then
    echo -e "${YELLOW}可用备份文件列表：${NC}"
    echo
    ls -lht "$BACKUP_DIR"/prod_db_*.db | awk '{print $9, "(" $6 " " $7 " " $8 ")"}' | nl
    echo
    echo -e "${RED}使用方法:${NC}"
    echo "  $0 <备份文件名>"
    echo "  示例: $0 prod_db_20260324_120541.db"
    echo
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

# 检查备份文件是否存在
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}错误：备份文件不存在: $BACKUP_FILE${NC}"
    exit 1
fi

# 显示当前数据库信息
echo -e "${YELLOW}当前数据库信息：${NC}"
ls -lh "$DB_PATH"
echo

# 显示将要恢复的备份信息
echo -e "${YELLOW}将要恢复的备份：${NC}"
ls -lh "$BACKUP_FILE"
echo

# 确认操作
read -p "确认要恢复到此备份吗？这将覆盖当前数据库！[y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消恢复操作"
    exit 0
fi

# 停止 CMS 服务
echo -e "${YELLOW}停止 CMS 服务...${NC}"
sudo systemctl stop fedzx-cms

# 备份当前数据库（以防需要回滚）
echo -e "${YELLOW}备份当前数据库...${NC}"
CURRENT_BACKUP="$BACKUP_DIR/prod_db_before_restore_$(date +%Y%m%d_%H%M%S).db"
cp "$DB_PATH" "$CURRENT_BACKUP"
echo "当前数据库已备份到: $CURRENT_BACKUP"

# 恢复数据库
echo -e "${YELLOW}正在恢复数据库...${NC}"
cp "$BACKUP_FILE" "$DB_PATH"

# 重启 CMS 服务
echo -e "${YELLOW}重启 CMS 服务...${NC}"
sudo systemctl start fedzx-cms

# 验证服务状态
sleep 2
if systemctl is-active --quiet fedzx-cms; then
    echo -e "${GREEN}✓ CMS 服务已启动${NC}"
else
    echo -e "${RED}✗ CMS 服务启动失败！${NC}"
    echo "请检查日志: sudo journalctl -u fedzx-cms -n 50"
    exit 1
fi

echo
echo -e "${GREEN}========== 恢复完成！==========${NC}"
echo -e "当前数据库已恢复到备份: ${GREEN}$1${NC}"
