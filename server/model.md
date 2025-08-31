erDiagram
   USER {
        guid id PK
        string name
        string password
    }

    SHEET {
        guid id PK
        string name
        guid SheetType_id FK
        int width
        int height
    }

    SHEETTYPE {
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
        str name 
    }

    PIECE {
        guid id PK
        guid cabinet_id FK
        guid SheetType_id FK
        str name
        int width 
        int height 
    }

    PLACEMENT {
        guid id PK
        guid PlacementGroup_id PK
        guid job_id FK
        guid sheet_id FK
        guid piece_id FK
        int piece_x
        int piece_y
        int piece_width
        int piece_height
        int angle
    }

    PLACEMENTGROUP {
        guid id PK
        str optimiseMethod
        date DATETIME
        guid job_id
    }

    USER ||--|{ JOB : "contains"
    JOB ||--|{ CABINET : "contains"
    CABINET ||--|{ PIECE : "made up of"
    PIECE ||--|| SHEETTYPE : "has a"
    SHEET ||--|| SHEETTYPE : "is a specific"
    PLACEMENT |{--|| PIECE : ""
    PLACEMENT |{--|| SHEET : ""
    PLACEMENT ||--|| PLACEMENTGROUP : ""
    PLACEMENTGROUP ||--|| JOB : ""