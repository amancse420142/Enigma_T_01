const Note = require('../models/Note');

// @desc    Get user notes
// @route   GET /api/notes
// @access  Private
const getNotes = async (req, res) => {
  try {
    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      const notes = await mockDb.getNotes(req.user.id);
      return res.status(200).json(notes);
    }
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.status(200).json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
const createNote = async (req, res) => {
  const { title, content, color } = req.body;

  try {
    if (!title || !content) {
      return res.status(400).json({ message: 'Please add a title and content' });
    }

    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      const note = await mockDb.createNote(title, content, color, req.user.id);
      return res.status(201).json(note);
    }

    const note = await Note.create({
      title,
      content,
      color: color || '#2d3748',
      userId: req.user.id
    });

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = async (req, res) => {
  const { title, content, color } = req.body;

  try {
    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      try {
        const updatedNote = await mockDb.updateNote(req.params.id, { title, content, color }, req.user.id);
        if (!updatedNote) {
          return res.status(404).json({ message: 'Note not found' });
        }
        return res.status(200).json(updatedNote);
      } catch (err) {
        return res.status(401).json({ message: err.message });
      }
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check for user ownership
    if (note.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to update this note' });
    }

    // Update fields
    if (title) note.title = title;
    if (content) note.content = content;
    if (color) note.color = color;

    const updatedNote = await note.save();

    res.status(200).json(updatedNote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = async (req, res) => {
  try {
    if (global.useMockDB) {
      const mockDb = require('../config/mockDb');
      try {
        const success = await mockDb.deleteNote(req.params.id, req.user.id);
        if (!success) {
          return res.status(404).json({ message: 'Note not found' });
        }
        return res.status(200).json({ id: req.params.id, message: 'Note removed successfully' });
      } catch (err) {
        return res.status(401).json({ message: err.message });
      }
    }

    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Check for user ownership
    if (note.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized to delete this note' });
    }

    await note.deleteOne();

    res.status(200).json({ id: req.params.id, message: 'Note removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote
};
