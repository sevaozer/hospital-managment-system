-- =============================================
-- Fonksiyon 1: fn_HesaplaYas (Oluþturma)
-- =============================================
IF OBJECT_ID('fn_HesaplaYas', 'FN') IS NOT NULL
    DROP FUNCTION fn_HesaplaYas;
GO

CREATE FUNCTION dbo.fn_HesaplaYas (@DogumTarihi DATE)
RETURNS INT
AS
BEGIN
    RETURN DATEDIFF(YEAR, @DogumTarihi, GETDATE());
END
GO

PRINT 'Fonksiyon fn_HesaplaYas baþarýyla oluþturuldu.';