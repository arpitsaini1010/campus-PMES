/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specified roles.
 * Returns 403 Forbidden if user role is not authorized.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access denied for role '${req.user.role}'`
      });
    }

    next();
  };
};

module.exports = authorize;
