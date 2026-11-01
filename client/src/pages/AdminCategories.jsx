import React, { useState, useEffect } from 'react';
import { categoryAPI } from '../api';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCatName, setEditCatName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await categoryAPI.getAll();
      setCategories(res.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setError('');
    setSuccess('');

    try {
      const res = await categoryAPI.create(newCatName.trim());
      setSuccess(res.data.message || 'Category created successfully!');
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating category.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editCatName.trim() || !editingCategory) return;

    setError('');
    setSuccess('');

    try {
      const res = await categoryAPI.update(editingCategory._id, editCatName.trim());
      setSuccess(res.data.message || 'Category updated successfully!');
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating category.');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await categoryAPI.delete(category._id);
      setSuccess(res.data.message || 'Category deleted.');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting category.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Project <span className="gradient-text">Categories</span>
          </h2>
          <p className="text-muted mb-0">
            Manage academic domains and technical areas available for project registration
          </p>
        </div>
      </div>

      {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 mb-3">{success}</div>}

      <div className="row g-4">
        {/* Add Category Card */}
        <div className="col-12 col-md-5">
          <div className="pmes-card">
            <h4 className="fw-bold text-dark mb-3">Add New Category</h4>
            <form onSubmit={handleCreate}>
              <div className="mb-3">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Distributed Systems & Cloud"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  required
                  id="input-new-category"
                />
              </div>
              <button type="submit" className="btn btn-pmes-primary w-100 py-2" id="btn-create-category">
                <i className="bi bi-plus-circle me-1"></i> Add Category
              </button>
            </form>
          </div>
        </div>

        {/* Existing Categories List */}
        <div className="col-12 col-md-7">
          <div className="pmes-card">
            <h4 className="fw-bold text-dark mb-3">Active Categories ({categories.length})</h4>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-muted text-center py-4">No categories created yet.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {categories.map((c) => (
                  <div
                    key={c._id}
                    className="p-3 rounded-3 d-flex justify-content-between align-items-center bg-light border"
                  >
                    <div className="fw-semibold text-dark">
                      <i className="bi bi-tag-fill me-2 text-primary"></i>
                      {c.name}
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setEditingCategory(c);
                          setEditCatName(c.name);
                        }}
                        title="Edit Category"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(c)}
                        title="Delete Category"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pmes-card border-0">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">Edit Category</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingCategory(null)}
                ></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-pmes-secondary"
                    onClick={() => setEditingCategory(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-pmes-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
