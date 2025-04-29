import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import JoditEditor from "jodit-react";
import PageWrapper from "./PageWrapper";
import HTMLReactParser from "html-react-parser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import Lightbox from "react-image-lightbox";
import "react-image-lightbox/style.css";
import LogoutButton from './LogoutButton';

function NewsCreator() {

  const [currentUser, setCurrentUser] = useState(null);

  const [nickname, setNickname] = useState("");
  
  const [event_start, setDate] = useState("");

  const titleRef = useRef("");

  const [description, setDescription] = useState("");

  const [newsImages, setNewsImages] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);

  const [dragActive, setDragActive] = useState(false);

  // Lightbox State
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  // Добавляем состояние для режима редактирования
  const [isEditMode, setIsEditMode] = useState(false);
  const [editNewsId, setEditNewsId] = useState(null);


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
              toast.warn("Перетаскивание изображений запрещено!");
              return false;
            }
          }
        }
      }
    }
  }), []);

  // Конфигурация Flatpickr
  const configFlatpickr = useMemo(() => ({
    enableTime: true,
    altInput: true,
    altFormat: "F j, Y, H:i",
    dateFormat: "Y-m-d\\TH:i:ss",
    locale: Russian,
    defaultDate: event_start, // Добавляем текущую дату из состояния
    date: event_start, // Альтернативный вариант
  }), [event_start]); // Добавляем date в зависимости

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

  const handleDateChange = (selectedDate) => {
    setDate(selectedDate[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  
    const files = Array.from(e.dataTransfer.files);
    const hasInvalidFiles = files.some(file => !file.type.startsWith('image/'));
  
    if (hasInvalidFiles) {
      // Очищаем только если есть невалидные файлы
      if (e.dataTransfer.items) {
        const items = Array.from(e.dataTransfer.items);
        items.forEach((item, index) => {
          if (item.kind === 'file' && !files[index].type.startsWith('image/')) {
            e.dataTransfer.items.remove(item);
          }
        });
      } else {
        e.dataTransfer.clearData();
      }
    }
  
    handleFiles(files);
  };
  
  const handleFiles = (files) => {
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
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
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

  const handleDeleteThumbnail = (thumbnailId) => {
    // Удаляем изображение из состояния
    setNewsImages((prevImages) => prevImages.filter((image) => image.id !== thumbnailId));
  
    // Обновляем файловый input
    const fileInput = document.getElementById("news-image");
    if (fileInput) {
      const dataTransfer = new DataTransfer(); // Создаем новый объект DataTransfer
  
      // Добавляем все файлы, кроме удаленного
      Array.from(fileInput.files).forEach((file) => {
        if (file.uniqueKey !== thumbnailId) { // Проверяем уникальный ключ
          dataTransfer.items.add(file);
        }
      });
  
      // Обновляем файловый input
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
    setCurrentImages(newsImages.map(img => img.preview));
    setPhotoIndex(index);
    setIsOpen(true);
  };

  // Эффект для управления прокруткой страницы
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.removeAttribute("aria-hidden"); // Удаляем атрибут
    } else {
      document.body.style.overflow = "auto";
    }
  
    return () => {
      document.body.style.overflow = "auto";
      document.body.removeAttribute("aria-hidden"); // Очистка
    };
  }, [isOpen]);


  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleRestartPreview = () => {
    setPreviewMode(false);
  };

  const handleNewsList = () => {
    window.open("/news-list", "_blank");
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
      setNickname(userData.nickname); // Устанавливаем никнейм из данных пользователя
    } else {
      // Если нет данных пользователя, перенаправляем на страницу входа
      window.location.href = '/login';
    }
  }, []);

  const loadNewsData = useCallback(async (newsId) => {
    try {
      console.log('Loading news data for ID:', newsId);
      const response = await fetch(`http://127.0.0.1:5000/api/news/${newsId}`);
      
      if (response.ok) {
        const formData = await response.json();
        
        setNickname(formData.publisher_nick || "");
        setTitle(formData.title || "");
        setDescription(formData.description || "");
        
        if (formData.event_start) {
          setDate(new Date(formData.event_start));
        }
        
        if (formData.files && formData.files.length > 0) {
          const images = await Promise.all(
            formData.files.map(async (file) => {
              return {
                id: uuidv4(),
                fileName: file.fileName,
                preview: `http://127.0.0.1:5000/uploads/${file.fileName}`
              };
            })
          );
          setNewsImages(images.filter(Boolean));
        }
      } else {
        toast.error("Не удалось загрузить данные новости", configToast);
      }
    } catch (error) {
      console.error("Error loading news data:", error);
      toast.error("Не удалось загрузить данные новости", configToast);
    }
  }, [configToast]); // Все зависимости функции


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
    if (!currentUser.nickname.trim()) {
      toast.error("Ошибка идентификации пользователя! Пожалуйста, авторизуйтесь заново", configToast);
      return;
    }
  
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
  
    // Подготовка FormData
    const formData = new FormData();
    formData.append("login", currentUser.login);
    formData.append("nickname", currentUser.nickname);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("event_start", new Date(event_start).toISOString());
  
    // Добавляем ВСЕ файлы (и новые, и существующие)
    newsImages.forEach((image) => {
      if (image.file) {
        // Новые файлы
        formData.append("files", image.file);
      } else if (image.fileName) {
        // Существующие файлы (передаем как строку)
        formData.append("existing_files", image.fileName);
      }
    });

    // Добавляем флаг редактирования
    if (isEditMode) {
      formData.append("is_edit", "true");
    }

    // Логирование FormData
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value instanceof File ? `${value.name} (File)` : value);
    }

    try {
      const response = await fetch(
        isEditMode 
          ? `http://127.0.0.1:5000/api/news/${editNewsId}`
          : "http://127.0.0.1:5000/api/news",
        {
          method: isEditMode ? "PUT" : "POST",
          credentials: "include",
          body: formData,
        }
      );
    
      if (response.status === 401) {
        toast.error("Вы не авторизованы. Пожалуйста, войдите в систему.", configToast);

        return;
      }
    
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.DESCRIPTION || "Ошибка сервера");
      }
    
      const result = await response.json();
      console.log("Server response:", result);
    
      toast.success(
        isEditMode 
          ? "Новость успешно обновлена!" 
          : "Новость успешно отправлена!",
        configToast
      );
    
    } catch (error) {
      console.error("Full error:", error);
      toast.error(
        error.message || "Ошибка при сохранении новости",
        configToast
      );
    }
  };

  const MemoizedJoditEditor = useMemo(() => {
    return (
      <JoditEditor
        name="description"
        value={description}
        config={configJoditEditor}
        tabIndex={1}
        onBlur={(newText) => setDescription(newText)}
      />
    );
  }, [description, configJoditEditor]);

  const MemoizedFlatpickr = useMemo(() => {
    return (
      <Flatpickr
        id="news-date"
        name="event_start"
        placeholder="Выберите дату события"
        options={configFlatpickr}
        onChange={handleDateChange}
        value={event_start} // Передаем текущее значение даты
        key={event_start ? event_start.toString() : 'empty'} // Принудительное обновление при изменении даты
      />
    );
  }, [configFlatpickr, event_start]); // Добавляем event_start в зависимости

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
      <title>Конфигуратор публикаций</title>
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
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                id="news-nickname"
                name="nickname"
                className="inpt"
                placeholder="Введите имя пользователя"
                disabled={!isEditMode}
              />
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

            {MemoizedJoditEditor}

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

            {isOpen && (
              <Lightbox
              mainSrc={currentImages[photoIndex]}
              nextSrc={currentImages[(photoIndex + 1) % currentImages.length]}
              prevSrc={currentImages[(photoIndex + currentImages.length - 1) % currentImages.length]}
              onCloseRequest={() => setIsOpen(false)}
              onMovePrevRequest={() => 
                setPhotoIndex((photoIndex + currentImages.length - 1) % currentImages.length)
              }
              onMoveNextRequest={() => 
                setPhotoIndex((photoIndex + 1) % currentImages.length)
              }
              imageTitle={`Изображение ${photoIndex + 1} из ${currentImages.length}`}
              />
            )}

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

          {currentUser?.role === 'Administrator' && (
            <button 
              className="custom_button" 
              id="admin-panel"
              onClick={() => window.location.href = '/admin-panel'}
            >
              Администрирование
            </button>
          )}

          <button className="custom_button" id="newslist" onClick={handleNewsList}>
            Список публикаций
          </button>

          <LogoutButton />

        </div>
      </div>
      {MemoizedToastContainer}
    </PageWrapper>
  );
}

export default NewsCreator;