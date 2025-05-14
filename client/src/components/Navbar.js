import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Button, Typography } from '@mui/material';
import { useCookies } from 'react-cookie';
import { jwtDecode } from 'jwt-decode';

export default function Navbar() {
  const [cookies, , removeCookie] = useCookies(['token']);
  const tokenData = cookies.token ? jwtDecode(cookies.token) : null;

  const handleLogout = () => {
    removeCookie('token');
    window.location.href = '/login';
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Волонтерская система
        </Typography>
	<Button 
             color="inherit" 
  	    component={Link} 
  	    to="/create-event"
	    >
  	    Создать мероприятие
	</Button>
	<Button 
  	    color="inherit" 
  	    component={Link} 
  	    to="/organizers"
	>
  	Организаторы
	</Button>
        <Button color="inherit" component={Link} to="/">
          Календарь
        </Button>

        {/* Для всех авторизованных */}
        {cookies.token && (
          <Button 
            color="inherit" 
            component={Link} 
            to="/reports"
          >
            Отчеты
          </Button>
        )}

        {cookies.token ? (
          <>
            <Button 
              color="inherit" 
              component={Link} 
              to="/profile"
              sx={{ marginLeft: 'auto' }}
            >
              Профиль
            </Button>
            <Button color="inherit" onClick={handleLogout}>
              Выход
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} to="/login">
              Вход
            </Button>
            <Button color="inherit" component={Link} to="/register">
              Регистрация
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}