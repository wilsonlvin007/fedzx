#!/bin/bash
# FEDZX CMS 数据库备份脚本
# 每日自动备份，保留最近 30 天

set -e

# 配置
DB_PATH="/opt/fedzx/apps/cms/prod.db"
BACKUP_DIR="/opt/fedzx/backups/cms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/prod_db_${TIMESTAMP}.db"
LOG_FILE="/opt/fedzx/backups/backup.log"
RETENTION_DAYS=30

# 创建日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 开始数据库备份 =========="

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    log "错误：数据库文件不存在: $DB_PATH"
    exit 1
fi

# 获取数据库文件大小
DB_SIZE=$(ls -lh "$DB_PATH" | awk '{print $5}')
log "数据库文件大小: $DB_SIZE"

# 复制数据库（使用 sqlite3 backup 命令确保一致性）
log "正在备份数据库..."
sqlite3 "$DB_PATH" ".backup $BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    log "备份成功: $BACKUP_FILE (大小: $BACKUP_SIZE)"
else
    log "错误：备份失败"
    exit 1
fi

# 清理旧备份（保留最近 30 天）
log "清理 $RETENTION_DAYS 天前的旧备份..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "prod_db_*.db" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
log "已删除 $DELETED_COUNT 个旧备份文件"

# 统计当前备份数量
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "prod_db_*.db" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
log "当前备份数量: $BACKUP_COUNT, 总大小: $TOTAL_SIZE"

log "========== 备份完成 =========="
