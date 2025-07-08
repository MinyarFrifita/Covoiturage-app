export const getDefaultRedirect = (role) => {
  switch (role) {
    case 'admin':
      return '/admin-panel';
    case 'driver':
      return '/driver-dashboard';
    case 'passenger':
      return '/passenger-dashboard';
    default:
      return '/';
  }
};
