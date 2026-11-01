const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');

// @route   GET /api/categories
// @desc    List all categories
// @access  Public / Authenticated
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving categories.' });
  }
});

// @route   POST /api/categories
// @desc    Create project category (FR-ADM-03)
// @access  Admin
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'A category with this name already exists.' });
    }

    const category = new Category({ name: trimmedName });
    await category.save();

    res.status(201).json({
      message: 'Category created successfully.',
      category
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error creating category.' });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update category name (FR-ADM-03)
// @access  Admin
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({
      _id: { $ne: req.params.id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({ message: 'Another category with this name already exists.' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name: trimmedName },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.json({
      message: 'Category updated successfully.',
      category
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating category.' });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete category (Cannot delete if in use by any project per FR-ADM-03)
// @access  Admin
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    // Check if category is in use
    const projectCount = await Project.countDocuments({ category: req.params.id });
    if (projectCount > 0) {
      return res.status(400).json({
        message: `Cannot delete category: It is currently used by ${projectCount} project(s).`
      });
    }

    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category.' });
  }
});

module.exports = router;
