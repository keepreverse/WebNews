import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { v4 as uuidv4 } from "uuid";
import JoditEditor from "jodit-react";
import PageWrapper from "./PageWrapper";
import HTMLReactParser from "html-react-parser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import LogoutButton from './LogoutButton';

import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

import { api } from './apiClient';
import { isTokenValid } from './utils/jwt';

function NewsCreator() {

  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);

  const [nickname, setNickname] = useState("");
  
  const [event_start, setDate] = useState("");

  const editorRef = useRef(null);

  const titleRef = useRef("");

  const [description, setDescription] = useState("");

  const [newsImages, setNewsImages] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  const [dragActive, setDragActive] = useState(false);


  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);


  // Добавляем состояние для режима редактирования
  const [isEditMode, setIsEditMode] = useState(false);
  const [editNewsId, setEditNewsId] = useState(null);

  const [users, setUsers] = useState([]);
  const [selectedAuthor, setSelectedAuthor] = useState('');



  // Конфигурация JoditEditor
  const configJoditEditor = useMemo(() => ({
    toolbarAdaptive: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    allowResizeX: false,
    autofocus: false,
    saveModeInStorage: true,
    askBeforePasteHTML: true,
    askBeforePasteFromWord: true,
    toolbarButtonSize: "large",
    placeholder: "Введите текст новости",
    minHeight: 200,
    disablePlugins:
      "video,about,add-new-line,class-span,source,resizer," +
      "speech-recognize,spellcheck,stat,drag-and-drop," +
      "drag-and-drop-element,clipboard,copyformat," +
      "delete-command,file,format-block,hotkeys," +
      "iframe,image,image-processor,image-properties,indent," +
      "inline-popup,media,paste-from-word," +
      "paste-storage,powered-by-jodit,print,search,sticky," +
      "symbols,table,table-keyboard-navigation,wrap-nodes",
    buttons:
      "undo redo | fontsize | bold italic underline brush link | align ol ul | eraser | fullsize |",
    events: {
      beforePaste(event, editor) {
        const clipboardData = event.clipboardData || window.clipboardData;
        if (clipboardData) {
          const items = clipboardData.items;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              toast.warn("Вставка изображений запрещена!");
              return false;
            }
          }
        }
      },
      drop(event, editor) {
        const dt = event.dataTransfer;
        if (dt && dt.files.length > 0) {
          for (const file of dt.files) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              toast.warn("Вставка изображений запрещена!");
              return false;
            }
          }
        }
      }
    }
  }), []);

  const configFlatpickr = useMemo(() => ({
    enableTime: true,
    altInput: true,
    altFormat: "F j, Y, H:i",
    dateFormat: "Y-m-d\\TH:i:ss",
    locale: Russian,
  }), []);
  
  // Конфигурация Toast
  const configToast = useMemo(() => ({
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  }), []);

  // Debounce для заголовка
  function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  }

  const [title, setTitle] = useState("");
  const debouncedTitle = useDebounce(title, 500);

  const handleTitleChange = useCallback((e) => {
    titleRef.current = e.target.value;
    setTitle(e.target.value);
  }, []);

  const handleFiles = (files) => {
    const fileInput = document.getElementById("news-image");
    if (!fileInput) return; // Защита от отсутствия элемента
    
    const validImages = [];
    const invalidFiles = [];
  
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const uniqueKey = uuidv4();
        file.uniqueKey = uniqueKey;
        validImages.push({
          id: uniqueKey,
          file: file,
          preview: URL.createObjectURL(file)
        });
      } else {
        invalidFiles.push(file.name);
      }
    });
  
    if (invalidFiles.length > 0) {
      toast.warn(`Не удалось загрузить файлы: ${invalidFiles.join(', ')}.`, {
        autoClose: 5000,
        closeButton: true
      });
      
      // Очищаем поле ввода только при невалидных файлах
      document.getElementById('news-image').value = '';
    }
  
    if (validImages.length > 0) {
      setNewsImages(prev => [...prev, ...validImages]);
    }
  };
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  
    const files = Array.from(e.dataTransfer.files);
    const hasInvalidFiles = files.some(file => !file.type.startsWith('image/'));
  
    if (hasInvalidFiles) {
      toast.warn('Можно загружать только изображения (JPG, PNG, GIF)!', {
        autoClose: 5000,
      });
      return; // Прерываем обработку, если есть невалидные файлы
    }
  
    handleFiles(files); // Обрабатываем только валидные файлы
  };

  const handleDeleteThumbnail = (thumbnailId) => {
    setNewsImages(prev => prev.filter(image => image.id !== thumbnailId));

    // Добавляем проверку на существование элемента и его свойств
    const fileInput = document.getElementById("news-image");
    if (fileInput && fileInput.files) { // Двойная проверка
      const dataTransfer = new DataTransfer();
      
      Array.from(fileInput.files).forEach(file => {
        if (file.uniqueKey !== thumbnailId) {
          dataTransfer.items.add(file);
        }
      });

      fileInput.files = dataTransfer.files;
    }
  };

  const handleDeleteAllThumbnails = () => {
    setNewsImages([]);
    const fileInput = document.getElementById("news-image");
    if (fileInput) {
      fileInput.value = ""; // Сброс input
    }
  };

  window.addEventListener('error', (event) => {
    if (event.message.includes('Jodit')) {
      window.location.reload(); // Перезагрузка при критических ошибках
    }
  });

// 1. Добавим состояние для принудительного ререндера редактора
const [editorKey, setEditorKey] = useState(Date.now());
const isMountedRef = useRef(true);

useEffect(() => {
  const editor = editorRef.current;
  isMountedRef.current = true;

  const handleBlur = (newText) => {
    if (isMountedRef.current) {
      setDescription(newText);
    }
  };

  const handleError = (error) => {
    console.error('Jodit Error:', error);
    if (isMountedRef.current) {
      setEditorKey(Date.now());
    }
  };

  if (editor) {
    editor.events
      .on('blur', handleBlur)
      .on('error', handleError);
  }

  return () => {
    isMountedRef.current = false;
    if (editor) {
      try {
        editor.events.off('blur', handleBlur);
        editor.events.off('error', handleError);
        editor.destruct();
      } catch (e) {
        console.warn('Jodit cleanup error:', e);
      }
    }
  };
}, [editorKey]);

  // Функция для открытия лайтбокса
  const openLightbox = (index) => {
    setLightboxSlides(newsImages.map(img => ({
      src: img.file ? URL.createObjectURL(img.file) : img.preview, // Используем оригинальный файл если есть
      alt: `Изображение ${index + 1}`
    })));
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleRestartPreview = () => {
    setPreviewMode(false);
  };

// 4. Обработчик навигации с сбросом состояния
const handleNavigation = (path) => {
  setEditorKey(Date.now()); // Принудительный ререндер при навигации
  navigate(path);
};

  const handleNewsList = () => handleNavigation('/news-list');
  const handleAdminPanel = () => handleNavigation('/admin-panel');

  // Функция для загрузки списка пользователей
  const loadUsers = useCallback(async () => {
    try {
      const usersList = await api.get('/api/admin/users');
      setUsers(usersList);
      
      // Устанавливаем текущего автора как выбранного по умолчанию
      if (isEditMode && nickname) {
        setSelectedAuthor(nickname);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Не удалось загрузить список пользователей', configToast);
    }
  }, [configToast, isEditMode, nickname]);

  // Загружаем пользователей при монтировании компонента
  useEffect(() => {
    if (currentUser?.role === 'Administrator' || currentUser?.role === 'Moderator') {
      loadUsers();
    }
  }, [currentUser?.role, loadUsers]);

  // Обновляем выбранного автора при изменении nickname
  useEffect(() => {
    if (nickname) {
      setSelectedAuthor(nickname);
    }
  }, [nickname]);


  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Получаем данные пользователя
        const userData = JSON.parse(
          localStorage.getItem('user') || 
          sessionStorage.getItem('user') || 
          'null'
        );
  
        // 2. Проверка наличия данных
        if (!userData?.token) {
          navigate('/login', { replace: true });
          return;
        }
  
        // 3. Валидация токена
        if (!isTokenValid(userData.token)) {
          throw new Error('Сессия истекла');
        }
  
        // 4. Установка состояния
        setCurrentUser(userData);
        setNickname(userData.nickname || '');
        api.setAuthToken(userData.token);
  
      } catch (error) {
        console.error('Auth check failed:', error);
        // Очистка данных
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        api.setAuthToken(null);
        
        toast.error(error.message || 'Требуется авторизация');
        navigate('/login', { replace: true });
      }
    };
  
    checkAuth();
  }, [navigate]); // Добавляем navigate в зависимости

  const loadNewsData = useCallback(async (newsId) => {
    try {
      console.log('Loading news data for ID:', newsId);
      const formData = await api.get(`/api/news/${newsId}`);
      
      setNickname(formData.publisher_nick || "");
      setTitle(formData.title || "");
      setDescription(formData.description || "");
      
      if (formData.event_start) {
        setDate(new Date(formData.event_start));
      }
      
      if (formData.files && formData.files.length > 0) {
        const images = formData.files.map(file => ({
          id: uuidv4(),
          fileName: file.fileName,
          preview: `http://127.0.0.1:5000/uploads/${file.fileName}`
        }));
        setNewsImages(images);
      }
    } catch (error) {
      console.error("Error loading news data:", error);
      toast.error(error.message || "Не удалось загрузить данные новости", configToast);
    }
  }, [configToast]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newsId = params.get('edit');
    
    if (newsId) {
      setIsEditMode(true);
      setEditNewsId(newsId);
      loadNewsData(newsId);
    }
  }, [loadNewsData]); // Теперь функция в зависимостях


  const handleSubmit = async (e) => {
    e.preventDefault();

    // Проверка аутентификации
    if (!currentUser || !currentUser.nickname) {
      toast.error("Требуется авторизация!", configToast);
      return;
    }

    // Валидация полей
    if (!event_start || event_start.length === 0) {
      toast.error("Пожалуйста, укажите дату события", configToast);
      return;
    }

    if (!title.trim()) {
      toast.error("Пожалуйста, введите заголовок новости", configToast);
      return;
    }

    if (!description.trim()) {
      toast.error("Пожалуйста, введите текст новости", configToast);
      return;
    }

    // Определяем автора и его логин
    let authorNickname = currentUser.nickname;
    let authorLogin = currentUser.login;

    // Для администраторов/модераторов в режиме редактирования
    if ((currentUser?.role === 'Administrator' || currentUser?.role === 'Moderator') && isEditMode) {
      if (!selectedAuthor) {
        toast.error('Не выбран автор публикации!', configToast);
        return;
      }

      // Находим выбранного пользователя
      const selectedUser = users.find(user => user.nick === selectedAuthor);
      if (!selectedUser) {
        toast.error('Выбранный автор не существует!', configToast);
        return;
      }

      authorNickname = selectedUser.nick;
      authorLogin = selectedUser.login;
    }

    // Подготовка FormData
    const formData = new FormData();
    formData.append("login", authorLogin); // Используем определенный выше логин
    formData.append("nickname", authorNickname); // Используем определенный выше никнейм
    formData.append("title", title);
    formData.append("description", description);
    formData.append("event_start", new Date(event_start).toISOString());
    
    // Добавляем статус "Pending" для всех новых публикаций
    if (!isEditMode) {
      formData.append("status", "Pending");
    }

    // Фильтруем и разделяем файлы
    const existingFiles = newsImages
      .filter(img => img.fileName)
      .map(img => img.fileName);

    const newFiles = newsImages
      .filter(img => img.file)
      .map(img => img.file);

    // Добавляем существующие файлы как отдельные поля
    if (isEditMode) {
      if (existingFiles.length === 0 && newsImages.length === 0) {
        formData.append("delete_all_files", "true");
      } else {
        existingFiles.forEach(fileName => {
          formData.append("existing_files", fileName);
        });
      }
    }

    // Добавляем новые файлы
    newFiles.forEach(file => {
      formData.append("files", file);
    });

    try {
      const result = await (isEditMode
        ? api.put(`/api/news/${editNewsId}`, formData, true)
        : api.post("/api/news", formData, true)
      );
      console.log("Server response:", result);

      if (isEditMode) {
        navigate('/news-list')
        setTimeout(() => {
          toast.success("Новость успешно обновлена!", configToast);
        }, 200);
      } else {
        toast.success("Новость отправлена на проверку!", configToast);
      }
        
    } catch (error) {
      console.error("Request error:", error);
      
      if (error.message.includes("401")) {
        navigate('/login', { 
          state: { from: location },
          replace: true 
        });
        return;
      }
    
      toast.error(
        error.message || "Ошибка при сохранении новости",
        configToast
      );
    }
  };

  useEffect(() => {
    const editorInstance = editorRef.current;

    return () => {
      if (editorInstance) {
        // Полная очистка редактора
        editorInstance.events.off("blur").off("change");
        editorInstance.destruct();
      }
    };
  }, []);

  // Обработчик изменения даты (теперь работает с диапазоном)
  const handleDateChange = (selectedDate) => {
    setDate(selectedDate);
  };

  const MemoizedFlatpickr = useMemo(() => {
    return (
      <Flatpickr
        name="event_start"
        placeholder="Выберите дату события"
        options={configFlatpickr} // onChange теперь внутри configFlatpickr
        value={event_start}
        onChange={handleDateChange}
      />
    );
  }, [configFlatpickr, event_start]);

  const MemoizedToastContainer = useMemo(() => <ToastContainer options={configToast}/>, [configToast]);

  const translateRole = (role) => {
    const roleTranslations = {
      'Administrator': 'Администратор',
      'Moderator': 'Модератор',
      'Publisher': 'Публикатор'
    };
    return roleTranslations[role] || role;
  };
  
  return (
    <PageWrapper>
    <Helmet>
      <title>Конфигуратор публикаций</title>
    </Helmet>
      <div id="news-form" className="container">
        <h1>Конфигуратор публикаций</h1>
        {currentUser && (
          <div className="user-info">
            <p>
              Текущий пользователь: {currentUser.nickname} ({currentUser.login})
            </p>
            <p>Роль: {translateRole(currentUser.role)}</p>
          </div>
        )}
        <div className="content">
          <form className="form" name="newsForm" onSubmit={handleSubmit}>
            {/* Полностью не рендерим поле, если Publisher */}
            {(currentUser?.role === 'Administrator' || currentUser?.role === 'Moderator') && isEditMode && (
              <div className="form-group">
                <label htmlFor="news-author">Автор публикации:</label>
                <select
                  id="news-author"
                  name="author"
                  className="inpt"
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                >
                  {users.map(user => (
                    <option key={user.userID} value={user.nick}>
                      {user.nick} ({user.login})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {MemoizedFlatpickr}

            <input
              type="text"
              id="news-title"
              name="title"
              className="inpt"
              placeholder="Введите заголовок новости"
              value={title}
              onChange={handleTitleChange}
            />

            {/* <JoditEditor
              key={`jodit-${editorKey}`}
              ref={editorRef}
              value={description}
              config={configJoditEditor}
            /> */}
            <JoditEditor
              name="description"
              value={description}
              config={configJoditEditor}
              tabIndex={1}
              key={`jodit-${editorKey}`}
              ref={editorRef}
              onBlur={(newText) => setDescription(newText)}
            />
            <div 
              id="drop-zone" 
              className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <p>Перетащите сюда или кликните для выбора файлов (JPG, PNG, GIF)</p>
              <input
                type="file"
                id="news-image"
                name="files[]"
                accept="image/jpeg,image/png,image/gif"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  if (files.some(file => !file.type.startsWith('image/'))) {
                    e.target.value = '';
                  }
                  handleFiles(files);
                }}
              />
            </div>

            {newsImages.length > 0 && (
              <div id="thumbnail-container" className="thumbnail-container">
                {newsImages.map((image, index) => (
                  <div key={image.id} className="thumbnail">
                    <img 
                      src={image.preview} 
                      alt="Thumbnail" 
                      onClick={() => openLightbox(index)}
                    />
                    <span 
                      className="delete-button" 
                      onClick={() => handleDeleteThumbnail(image.id)}
                    >
                      ✖
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Lightbox
              open={lightboxOpen}
              close={() => setLightboxOpen(false)}
              index={lightboxIndex}
              slides={lightboxSlides}
              plugins={[Fullscreen, Thumbnails, Zoom]}
              styles={{
                container: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
                thumbnail: {
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                },
                thumbnailsContainer: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                },
                icon: {
                  color: "rgba(255, 255, 255, 0.7)",
                  filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))",
                },
                iconDisabled: {
                  color: "rgba(255, 255, 255, 0.3)",
                },
                iconHover: {
                  color: "#fff",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                }
              }}
              thumbnails={{
                vignette: false,
              }}
              zoom={{
                maxZoomPixelRatio: 4, // Максимальный уровень увеличения
                zoomInMultiplier: 1.2,  // Множитель увеличения
                scrollToZoom: true    // Включить зум скроллом
              }}
            />

            {newsImages.length > 0 && (
              <button
                className="custom_button"
                id="delete"
                onClick={handleDeleteAllThumbnails}
              >
                Удалить все фотографии
              </button>
            )}

            {previewMode ? (
              <div className="view">
                {title && <h3>{HTMLReactParser(debouncedTitle)}</h3>}
                {description && (
                  <div id="view">{HTMLReactParser(description)}</div>
                )}
                <button
                  className="custom_button"
                  id="view"
                  onClick={handleRestartPreview}
                >
                  Закрыть предварительный просмотр
                </button>
              </div>
            ) : (
              <button
                className="custom_button"
                id="view"
                onClick={handlePreview}
              >
                Предварительный просмотр
              </button>
            )}
          
          <button type="submit" className="custom_button" id="submit">
            {isEditMode ? "Обновить публикацию" : "Отправить публикацию"}
          </button>
          </form>

          <button className="custom_button" id="newslist" onClick={handleNewsList}>
            Список публикаций
          </button>

          {currentUser?.role === 'Administrator' && (
            <button className="custom_button" id="admin-panel" onClick={handleAdminPanel}>
              Администрирование
            </button>
          )}

          <LogoutButton />

        </div>
      </div>
      {MemoizedToastContainer}
    </PageWrapper>
  );
}

export default NewsCreator;