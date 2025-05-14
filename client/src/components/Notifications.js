import { Snackbar, Alert } from '@mui/material';

export default function Notifications({ 
  open, 
  message, 
  severity = 'info', 
  onClose 
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
}