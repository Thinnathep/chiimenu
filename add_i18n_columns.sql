-- Add Chinese (zh) and Lanna/Northern Thai (nod) columns to menu_categories
ALTER TABLE menu_categories
ADD COLUMN name_zh VARCHAR(255),
ADD COLUMN name_nod VARCHAR(255);

-- Add Chinese and Lanna columns to menu_items
ALTER TABLE menu_items
ADD COLUMN name_zh VARCHAR(255),
ADD COLUMN name_nod VARCHAR(255),
ADD COLUMN description_zh TEXT,
ADD COLUMN description_nod TEXT;

-- Add Chinese and Lanna columns to customization_options
ALTER TABLE customization_options
ADD COLUMN name_zh VARCHAR(255),
ADD COLUMN name_nod VARCHAR(255);

-- Add Chinese and Lanna columns to customization_groups (Wait, let's verify if they had en)
-- I will add them just in case.
ALTER TABLE customization_groups
ADD COLUMN name_zh VARCHAR(255),
ADD COLUMN name_nod VARCHAR(255);
