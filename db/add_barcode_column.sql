-- ============================================
-- Add barcode_number column to cylinders table
-- ============================================
USE cystra_db;
GO

-- Check if column doesn't exist before adding
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('cylinders') 
    AND name = 'barcode_number'
)
BEGIN
    ALTER TABLE cylinders
    ADD barcode_number NVARCHAR(100);
    
    PRINT '✅ Column barcode_number added to cylinders table successfully!';
END
ELSE
BEGIN
    PRINT '⚠️ Column barcode_number already exists in cylinders table.';
END
GO

-- Optionally create an index on barcode_number for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_barcode_number' AND object_id = OBJECT_ID('cylinders'))
BEGIN
    CREATE INDEX idx_barcode_number ON cylinders(barcode_number);
    PRINT '✅ Index idx_barcode_number created successfully!';
END
ELSE
BEGIN
    PRINT '⚠️ Index idx_barcode_number already exists.';
END
GO

PRINT '';
PRINT '🎉 Database update completed successfully!';
GO

