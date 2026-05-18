import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ml_scans.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            spot_count INTEGER,
            texture_score REAL,
            pigmentation REAL,
            damage_score REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_scan(user_id, spot_count, texture_score, pigmentation, damage_score):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        'INSERT INTO scans (user_id, spot_count, texture_score, pigmentation, damage_score) VALUES (?, ?, ?, ?, ?)',
        (user_id, spot_count, texture_score, pigmentation, damage_score)
    )
    conn.commit()
    conn.close()
