// Add safety check - ensure permissions is always an array
  useEffect(() => {
    if (user?.rbac) {
      // New RBAC system
      const perms = user.rbac.permissions || [];
      setPermissions(Array.isArray(perms) ? perms : []);
      setRole(user.rbac.role || null);
      setLoading(false);
    } else if (user?.permissions) {
      // Fallback to legacy permissions if available
      const perms = user.permissions || [];
      setPermissions(Array.isArray(perms) ? perms : []);
      setRole(null);
      setLoading(false);
    } else {
      setPermissions([]);
      setRole(null);
      setLoading(false);
    }
  }, [user]);
  
  /**
   * Check if user has a specific permission
   * @param {string} permissionCode - Permission code (e.g., 'Employees.View')
   * @returns {boolean}
   */
  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode || !Array.isArray(permissions)) return false;
    return permissions.includes(permissionCode);
  }, [permissions]);
