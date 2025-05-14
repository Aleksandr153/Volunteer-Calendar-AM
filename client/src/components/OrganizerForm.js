// components/OrganizerForm.js
const OrganizerForm = () => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/organizers', { name, contact });
    // Обновить список организаторов
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Имя организатора"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <TextField
        label="Контактный телефон"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        required
      />
      <Button type="submit">Создать</Button>
    </form>
  );
};