# Диаграммы проекта "Linguist AI"

## Глава 1 - Анализ предметной области

### Рисунок 1: Схема предметной области (Domain Flowchart)

```mermaid
flowchart TB
    subgraph Actors["Акторы"]
        TEACHER["👨‍🏫 Преподаватель"]
        STUDENT["👨‍🎓 Студент"]
    end

    subgraph Processes["Процессы"]
        CREATE_ASSIGNMENT["📝 Создаёт задания"]
        COMPLETE_ASSIGNMENT["✅ Выполняет задания"]
    end

    subgraph Platform["🤖 Linguist AI Platform"]
        PLATFORM["Платформа"]
    end

    subgraph ExternalServices["Внешние сервисы"]
        GEMINI["🧠 Gemini AI API<br/>(Анализ речи)"]
        SUPABASE["🗄️ Supabase<br/>(База данных + Хранилище + Auth)"]
    end

    TEACHER --> CREATE_ASSIGNMENT
    CREATE_ASSIGNMENT --> PLATFORM

    STUDENT --> COMPLETE_ASSIGNMENT
    COMPLETE_ASSIGNMENT --> PLATFORM

    PLATFORM --> GEMINI
    PLATFORM --> SUPABASE

    style TEACHER fill:#e1f5fe
    style STUDENT fill:#e8f5e9
    style PLATFORM fill:#fff3e0
    style GEMINI fill:#f3e5f5
    style SUPABASE fill:#fce4ec
```

**Описание:** Данная схема демонстрирует основные компоненты предметной области системы Linguist AI. Преподаватель создаёт задания, студенты выполняют их через платформу. Платформа взаимодействует с внешними сервисами: Gemini AI API для анализа речи и Supabase для хранения данных, файлов и аутентификации.

