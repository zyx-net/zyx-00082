import type Database from 'better-sqlite3';

export function seedDatabase(db: Database.Database) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, password, name, role, phone, id_card_last4)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertChild = db.prepare(`
    INSERT INTO children (name, gender, age, class_name, guardian1_id, guardian2_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    insertUser.run('admin', 'admin123', '系统管理员', 'admin', '13800000001', '0001');
    insertUser.run('teacher1', 'teacher123', '李老师', 'teacher', '13800000002', '0002');
    insertUser.run('teacher2', 'teacher123', '王老师', 'teacher', '13800000003', '0003');
    insertUser.run('guardian1', 'guardian123', '张伟', 'guardian', '13900000001', '1234');
    insertUser.run('guardian2', 'guardian123', '李娜', 'guardian', '13900000002', '5678');
    insertUser.run('guardian3', 'guardian123', '王强', 'guardian', '13900000003', '9012');
    insertUser.run('guardian4', 'guardian123', '刘芳', 'guardian', '13900000004', '3456');
    insertUser.run('guardian5', 'guardian123', '陈明', 'guardian', '13900000005', '7890');
    insertUser.run('guardian6', 'guardian123', '赵丽', 'guardian', '13900000006', '2345');

    insertChild.run('小明', '男', 4, '太阳班', 4, 5);
    insertChild.run('小红', '女', 3, '月亮班', 4, 5);
    insertChild.run('小刚', '男', 5, '星星班', 6, 7);
    insertChild.run('小美', '女', 4, '太阳班', 8, 9);
    insertChild.run('小华', '男', 3, '月亮班', 8, 9);
  });

  tx();
}
