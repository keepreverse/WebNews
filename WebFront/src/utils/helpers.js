export function translateRole(role) {
  const roleTranslations = {
    'Administrator': 'Администратор',
    'Moderator': 'Модератор',
    'Publisher': 'Публикатор'
  };
  return roleTranslations[role] || role;
}
