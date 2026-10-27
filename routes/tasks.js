const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth); // every route below needs login

// GET all tasks (with search + filters)
router.get('/', async (req, res) => {
  const { search, status, priority } = req.query;
  const filter = { user: req.userId };

  if (search) filter.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (status === 'done') filter.done = true;
  if (status === 'pending') filter.done = false;
  if (priority) filter.priority = priority;

  const tasks = await Task.find(filter).sort({ done: 1, createdAt: -1 });
  res.json(tasks);
});

// GET stats for the dashboard cards
router.get('/stats', async (req, res) => {
  const user = req.userId;
  const [total, completed, overdue] = await Promise.all([
    Task.countDocuments({ user }),
    Task.countDocuments({ user, done: true }),
    Task.countDocuments({ user, done: false, dueDate: { $lt: new Date() } }),
  ]);
  res.json({ total, completed, pending: total - completed, overdue });
});

// CREATE
router.post('/', async (req, res) => {
  const { title, description, priority, category, dueDate } = req.body;
  if (!title || !title.trim())
    return res.status(400).json({ message: 'Title is required' });

  const task = await Task.create({
    user: req.userId,
    title,
    description,
    priority,
    category: category || 'General',
    dueDate: dueDate || null,
  });
  res.status(201).json(task);
});

// UPDATE (edit or mark done)
router.put('/:id', async (req, res) => {
  const allowed = ['title', 'description', 'priority', 'category', 'dueDate', 'done'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });
  if (updates.dueDate === '') updates.dueDate = null;

  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    updates,
    { new: true, runValidators: true }
  );
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(task);
});

// DELETE
router.delete('/:id', async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;