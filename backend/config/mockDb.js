const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../db.json');

const initDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], notes: [] }, null, 2));
  }
};

const readDB = () => {
  initDB();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], notes: [] };
  }
};

const writeDB = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

const mockDb = {
  findUserByUsername: async (username) => {
    const db = readDB();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  findUserById: async (id) => {
    const db = readDB();
    const user = db.users.find(u => u._id === id || u.id === id);
    if (user) {
      return { id: user._id, _id: user._id, username: user.username };
    }
    return null;
  },

  createUser: async (username, password) => {
    const db = readDB();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
      _id: 'user_' + Math.random().toString(36).substr(2, 9),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    writeDB(db);
    return { id: newUser._id, _id: newUser._id, username: newUser.username };
  },

  matchPassword: async (enteredPassword, hashedPassword) => {
    return await bcrypt.compare(enteredPassword, hashedPassword);
  },

  getNotes: async (userId) => {
    const db = readDB();
    return db.notes
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  },

  createNote: async (title, content, color, userId) => {
    const db = readDB();
    const newNote = {
      _id: 'note_' + Math.random().toString(36).substr(2, 9),
      title,
      content,
      color: color || '#fefbf3',
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.notes.push(newNote);
    writeDB(db);
    return newNote;
  },

  findNoteById: async (id) => {
    const db = readDB();
    return db.notes.find(n => n._id === id);
  },

  updateNote: async (id, fields, userId) => {
    const db = readDB();
    const index = db.notes.findIndex(n => n._id === id);
    if (index === -1) return null;
    
    if (db.notes[index].userId !== userId) {
      throw new Error('Not authorized');
    }
    
    if (fields.title) db.notes[index].title = fields.title;
    if (fields.content) db.notes[index].content = fields.content;
    if (fields.color) db.notes[index].color = fields.color;
    db.notes[index].updatedAt = new Date().toISOString();
    
    writeDB(db);
    return db.notes[index];
  },

  deleteNote: async (id, userId) => {
    const db = readDB();
    const index = db.notes.findIndex(n => n._id === id);
    if (index === -1) return false;
    
    if (db.notes[index].userId !== userId) {
      throw new Error('Not authorized');
    }
    
    db.notes.splice(index, 1);
    writeDB(db);
    return true;
  }
};

module.exports = mockDb;
