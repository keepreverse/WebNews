  import { useState, useEffect, useCallback, useRef, useMemo } from "react";
  import { useNavigate, useLocation } from 'react-router-dom';
  import { Helmet } from 'react-helmet-async';
  import { v4 as uuidv4 } from "uuid";
  import JoditEditor from "jodit-react";
  import PageWrapper from "../../features/PageWrapper";

  import HTMLReactParser from "html-react-parser";
  import { ToastContainer, toast } from "react-toastify";
  
  import Flatpickr from "react-flatpickr";
  import "flatpickr/dist/flatpickr.min.css";
  import { Russian } from "flatpickr/dist/l10n/ru.js";
  import { translateRole } from '../../utils/translatedRoles';

  import Lightbox from "yet-another-react-lightbox";
  import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
  import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
  import Zoom from "yet-another-react-lightbox/plugins/zoom";
  import "yet-another-react-lightbox/plugins/thumbnails.css";
  import "yet-another-react-lightbox/styles.css";

  import { api } from '../../services/apiClient';
  import { isAdmin, isModerator } from '../../services/authHelpers';
  import { getAuthToken, isTokenValid } from '../../services/authHelpers';

  function NewsCreator() {

    const navigate = useNavigate();
    const location = useLocation();

    const [currentUser, setCurrentUser] = useState(null);

    const [nickname, setNickname] = useState("");
    
    const [dateRange, setDateRange] = useState([]);


    const editorRef = useRef(null);

    const titleRef = useRef("");

    const descriptionRef = useRef("");

    const [newsImages, setNewsImages] = useState([]);
    const [previewMode, setPreviewMode] = useState(false);

    const [dragActive, setDragActive] = useState(false);

    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    
    useEffect(() => {
      api.ping().then((alive) => {
        if (!alive) {
          toast.error("Сервер не отвечает! Пожалуйста, попробуйте позже");
        }
      });
    }, []);

    // Загрузка категорий и тегов
    useEffect(() => {
      const loadCategoriess = async () => {
        try {
          const cats = await api.get('/categories');
          setCategories(cats);
        } catch (error) {
          toast.error('Ошибка загрузки категорий и тегов');
        }
      };
      loadCategoriess();
    }, []);


    // Lightbox State
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxSlides, setLightboxSlides] = useState([]);


    // Добавляем состояние для режима редактирования
    const [isEditMode, setIsEditMode] = useState(false);
    const [editNewsId, setEditNewsId] = useState(null);

    const [users, setUsers] = useState([]);
    const [selectedAuthor, setSelectedAuthor] = useState('');

    function cleanPastedHTML(rawHTML) {
      return rawHTML
        // Удалить изображения, стили, классы и мусор
        .replace(/<img[^>]*>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<(button|form|input|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, '')

        // Заменить таблицы на абзацы с текстом
        .replace(/<\/?(table|thead|tbody|tfoot|tr|td|th)[^>]*>/gi, '')

        // Удалить стили и классы
        .replace(/style="[^"]*"/gi, '')
        .replace(/class="[^"]*"/gi, '')
        .replace(/&nbsp;/gi, ' ')

        // Преобразование div в p
        .replace(/<div[^>]*>/gi, '<p>')
        .replace(/<\/div>/gi, '</p>')
        .replace(/<br\s*\/?>/gi, '</p><p>');
    }


    // Конфигурация JoditEditor
    const configJoditEditor = useMemo(() => ({
      toolbarAdaptive: false,
      showCharsCounter: false,
      showWordsCounter: false,
      showXPathInStatusbar: false,
      allowResizeX: false,
      autofocus: false,
      saveModeInStorage: true,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: true,
      toolbarButtonSize: "large",
      placeholder: 'Введите текст новости',
      removeEmptyBlocks: true,
      cleanHTML: {
        removeEmptyElements: true,
        fillEmptyParagraph: false,
        removeOnPaste: true,
        removeAttributes: ['style', 'class'],
        denyTags: ['font', 'style'],
      },
      defaultActionOnPaste: 'insert_clear_html',
      enter: 'div',
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
            for (const item of clipboardData.items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                toast.warn("Вставка изображений запрещена!");
                return false;
              }
            }
          }
        },
        onPaste(event) {
          const html = event.clipboardData?.getData("text/html") || "";
          const plainText = event.clipboardData?.getData("text/plain") || "";
          const editor = editorRef.current?.editor;

          if (html && editor) {
            event.preventDefault();
            const cleaned = cleanPastedHTML(html);
            const content = cleaned.trim() === '' && plainText.trim() !== '' ? plainText : cleaned;
            editor.selection.insertHTML(content);
          }
        },
        beforePasteInsert(html) {
          const cleaned = cleanPastedHTML(html);
          return cleaned;
        },
        drop(event) {
          const dt = event.dataTransfer;
          if (dt && dt.files.length > 0) {
            for (const file of dt.files) {
              if (file.type.startsWith("image/")) {
                event.preventDefault();
                toast.warn("Перетаскивание изображений запрещено!");
                return false;
              }
            }
          }
        },
        beforeDrop(event) { 
          const items = event?.dataTransfer?.items || [];
          for (const item of items) {
            if (item.kind === "file" && item.type.startsWith("image/")) {
              event.preventDefault();
              toast.warn("Перетаскивание изображений запрещено!");
              return false;
            }
          }
        },
        toggleFullSize: (isFull) => {
          if (isFull) {
            document.body.classList.add("jodit-full-active");
          } else {
            document.body.classList.remove("jodit-full-active");
          }
        }
      }
    }), []);


    const configFlatpickr = {
      mode: "range",
      enableTime: true,
      altInput: true,
      altFormat: "F j, Y, H:i",
      dateFormat: "Y-m-d\\TH:i:ss",
      locale: Russian,
      closeOnSelect: false,

      onChange: (dates, dateStr, instance) => {
        // Ничего не делаем здесь — чтобы не закрывать popup раньше времени
      },

      onClose: (selectedDates, dateStr, instance) => {
        // Записываем значение в state только когда оба конца диапазона выбраны
        if (selectedDates.length === 2) {
          setDateRange(selectedDates);
        }
      },
    };

    
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
    const debouncedTitle = useDebounce(title, 20);

    const handleTitleChange = useCallback((e) => {
      titleRef.current = e.target.value;
      setTitle(e.target.value);
    }, []);

    const [description, setDescription] = useState("");
    const debouncedDescription = useDebounce(description, 20);

    const handleDescriptionBlur = (text) => {
      descriptionRef.current = text;
      setDescription(text);
    };

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
        toast.warn('Можно загружать только изображения (JPG, PNG, GIF, WEBP)!', {
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


    // Функция для загрузки списка пользователей
    const loadUsers = useCallback(async () => {
      try {
        const usersList = await api.get('/admin/users');
        setUsers(usersList);
        
        // Устанавливаем текущего автора как выбранного по умолчанию
        if (isEditMode && nickname) {
          setSelectedAuthor(nickname);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        toast.error('Не удалось загрузить список пользователей');
      }
    }, [isEditMode, nickname]);

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
          const token = getAuthToken();

          if (!token || !isTokenValid(token)) {
            localStorage.removeItem('user');
            sessionStorage.removeItem('user');
            api.setAuthToken(null);

            navigate('/login', { replace: true });
            setTimeout(() => {
              toast.error("Сессия истекла, пожалуйста, войдите снова.", {
                autoClose: 4000,
              });
            }, 100);
            return;
          }

          const userData = JSON.parse(
            localStorage.getItem("user") || sessionStorage.getItem("user") || "null"
          );

          if (!userData) {
            throw new Error("Пользователь не найден");
          }

          setCurrentUser(userData);
          setNickname(userData.nickname || '');
          api.setAuthToken(userData.token);

        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
          api.setAuthToken(null);

          navigate('/login', { replace: true });
          setTimeout(() => {
            toast.error(error.message || 'Требуется авторизация', {
              autoClose: 4000,
            });
          }, 100);
        }
      };

      checkAuth();
    }, [navigate]);


    const loadNewsData = useCallback(async (newsId) => {
      try {
        const formData = await api.get(`/news/${newsId}`);
        
        setNickname(formData.publisher_nick || "");
        setSelectedCategory(formData.categoryID || "");
        setTitle(formData.title || "");
        setDescription(formData.description || "");
        
        if (formData.event_start && formData.event_end) {
          setDateRange([
            new Date(formData.event_start),
            new Date(formData.event_end)
          ]);
        }
        
        if (formData.files && formData.files.length > 0) {
          const images = formData.files.map(file => ({
            id: uuidv4(),
            fileName: file.fileName,
            preview: `https://webnews-1fwz.onrender.com/uploads/${file.fileName}`
          }));
          setNewsImages(images);
        }
      } catch (error) {
      }
    }, []);


    useEffect(() => {
      const params = new URLSearchParams(location.search);
      const newsId = params.get('edit');
      
      if (newsId) {
        setIsEditMode(true);
        setEditNewsId(newsId);
        loadNewsData(newsId);
      }
    }, [loadNewsData, location.search]); // Теперь функция в зависимостях


    const handleSubmit = async (e) => {
      e.preventDefault();

      // Проверка аутентификации
      if (!currentUser || !currentUser.nickname) {
        toast.error("Требуется авторизация!");
        return;
      }

      // Валидация полей
      if (!dateRange) {
        toast.error("Пожалуйста, укажите дату события");
        return;
      }

      if (dateRange.length < 2) {
        toast.warn("Чтобы указать дату с односоставным временным интервалом следует выбрать диапазон с одинаковым временем");
        return;
      }

      if (!title.trim()) {
        toast.error("Пожалуйста, введите заголовок новости");
        return;
      }

      if (!description.trim()) {
        toast.error("Пожалуйста, введите текст новости");
        return;
      }

      // Определяем автора и его логин
      let authorNickname = currentUser.nickname;
      let authorLogin = currentUser.login;

      // Для администраторов/модераторов в режиме редактирования
      if ((isAdmin(currentUser) || isModerator(currentUser)) && isEditMode) {
        if (!selectedAuthor) {
          toast.error('Не выбран автор публикации!');
          return;
        }

        // Находим выбранного пользователя
        const selectedUser = users.find(user => user.nick === selectedAuthor);
        if (!selectedUser) {
          toast.error('Выбранный автор не существует!');
          return;
        }

        authorNickname = selectedUser.nick;
        authorLogin = selectedUser.login;
      }

      // Подготовка FormData
      const formData = new FormData();
      formData.append("login", authorLogin); // Используем определенный выше логин
      formData.append("categoryID", selectedCategory);
      formData.append("nickname", authorNickname); // Используем определенный выше никнейм
      formData.append("title", title);
      formData.append("description", description);
      formData.append("event_start", new Date(dateRange[0]).toISOString());
      formData.append("event_end", new Date(dateRange[1]).toISOString());
      
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
        await (isEditMode
          ? api.put(`/news/${editNewsId}`, formData, true)
          : api.post("/news", formData, true)
        );

        if (isEditMode) {
          navigate('/news-list')
          setTimeout(() => {
            toast.success("Новость успешно обновлена!");
          }, 200);
        } else {
          toast.success("Новость отправлена на проверку!");
        }
          
      } catch (error) {
        if (error.message.includes("401")) {
          navigate('/login', { 
            state: { from: location },
            replace: true 
          });
          return;
        }
        toast.error("Ошибка при сохранении новости");
      }
    };

   
    return (
      <PageWrapper>
      <Helmet>
        <title>Конструктор публикаций</title>
      </Helmet>
        <div id="news-form" className="container">
          <h1>Конструктор публикаций</h1>
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
              {(isAdmin(currentUser) || isModerator(currentUser)) && isEditMode && (
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

              <div className="form-group">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Без категории</option>
                  {categories.map(cat => (
                    <option key={cat.categoryID} value={cat.categoryID}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <Flatpickr
                placeholder="Выберите дату события"
                options={configFlatpickr}
                value={dateRange}
              />

              <input
                type="text"
                id="news-title"
                name="title"
                className="inpt"
                placeholder="Введите заголовок новости"
                value={title}
                onChange={handleTitleChange}
              />

              <JoditEditor
                type="text"
                name="description"
                ref={editorRef}
                config={configJoditEditor}
                tabIndex={1}
                value={description}
                onBlur={handleDescriptionBlur}
              />

              <div 
                id="drop-zone" 
                className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
              >
                <p>Перетащите сюда или кликните для выбора файлов (JPG, PNG, GIF, WEBP)</p>
                <input
                  type="file"
                  id="news-image"
                  name="files[]"
                  accept="image/jpeg,image/png,image/gif,image/webp"
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
                  className="custom_button action-remove"
                  onClick={handleDeleteAllThumbnails}
                  type="button" 
                >
                  Удалить все фотографии
                </button>
              )}

              {previewMode ? (
                <div className="preview-container">
                  <button
                    className="custom_button"
                    onClick={handleRestartPreview}
                    type="button"
                  >
                    Закрыть предварительный просмотр
                  </button>

                  {title && <h3 className="preview-title">{HTMLReactParser(debouncedTitle)}</h3>}
                  {description && <div>{HTMLReactParser(debouncedDescription)}</div>}
                </div>
              ) : (
                <button
                  className="custom_button"
                  onClick={handlePreview}
                  type="button"
                >
                  Предварительный просмотр
                </button>
              )}
            
              <button type="submit" className="custom_button action-confirm">
                {isEditMode ? "Обновить публикацию" : "Отправить публикацию"}
              </button>
              
            </form>

          </div>
        </div>
        <ToastContainer/>
      </PageWrapper>
    );
  }

  export default NewsCreator;