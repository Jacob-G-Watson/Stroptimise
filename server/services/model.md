erDiagram
   USER {
        guid id PK
        string name
        string password
    }

    SHEET {
        guid id PK
        string name
        guid colour_id FK
        int width
        int height
    }

    COLOUR {
        guid id PK
        string name
    }

    JOB {
        guid id PK
        string name
        guid user_id FK
    }

    CABINET {
        guid id PK
        guid job_id FK
    }

    PIECE {
        guid id PK
        guid cabinet_id FK
        guid colour_id FK
        int width 
        int height 
    }

    CUTLIST {
        guid id PK
        guid job_id FK
        guid sheet_id FK
        guid piece_id FK
        int piece_x
        int piece_y
        int piece_width
        int piece_height
    }

    USER ||--|{ JOB : "contains"
    JOB ||--|{ CABINET : "contains"
    CABINET ||--|{ PIECE : "made up of"
    PIECE ||--|| COLOUR : "has a"
    SHEET ||--|| COLOUR : "is a specific"
    CUTLIST |{--|| PIECE : ""
    CUTLIST |{--|| SHEET : ""
    CUTLIST ||--|| JOB : ""