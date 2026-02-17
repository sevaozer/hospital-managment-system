-- =============================================
-- Trigger 3: trg_PreventDoctorDeletion
-- Doktorlar tablosundan bir kayýt silinmeye çalýþýldýðýnda,
-- doktorun aktif (gelecek veya tamamlanmamýþ) randevusu varsa
-- silme iþlemini engeller.
-- =============================================
IF OBJECT_ID('trg_PreventDoctorDeletion', 'TR') IS NOT NULL
    DROP TRIGGER trg_PreventDoctorDeletion;
GO

CREATE TRIGGER trg_PreventDoctorDeletion
ON dbo.Doktorlar        -- Bu trigger 'Doktorlar' tablosu üzerindedir
INSTEAD OF DELETE    -- 'DELETE' iþlemi yerine çalýþýr
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DoctorID INT;
    DECLARE @ActiveAppointmentCount INT;

    -- 'deleted' sanal tablosu, silinmeye çalýþýlan doktor kaydýný içerir.
    -- Varsayýyoruz ki ayný anda sadece tek bir doktor silinmeye çalýþýlýyor.
    SELECT @DoctorID = d.DoctorID FROM deleted AS d;

    -- Silinmeye çalýþýlan doktorun aktif randevu sayýsýný kontrol et
    SELECT @ActiveAppointmentCount = COUNT(*)
    FROM Randevular AS r
    WHERE r.DoctorID = @DoctorID
      AND r.AppointmentDate >= CAST(GETDATE() AS DATE) -- Bugünden veya gelecekten
      AND r.Status NOT IN ('Tamamlandý', 'Ýptal Edildi'); -- Tamamlanmamýþ veya iptal edilmemiþ

    -- Eðer aktif randevusu varsa, silme iþlemini engelle ve hata ver
    IF @ActiveAppointmentCount > 0
    BEGIN
        RAISERROR ('Bu doktorun aktif (%d adet) randevusu bulunmaktadýr ve silinemez.', 16, 1, @ActiveAppointmentCount);
        RETURN; -- Silme iþlemini gerçekleþtirme
    END
    ELSE
    BEGIN
        -- Eðer aktif randevusu yoksa, silme iþlemini gerçekleþtir.
        -- Önce Kullanicilar tablosundan sil (çünkü Doktorlar'da FK var)
        -- Önemli Not: Önce doktora ait diðer iliþkili veriler (örn: loglar) temizlenmeli.
        -- Basitlik adýna þimdilik sadece Kullanicilar ve Doktorlar'dan siliyoruz.
        DELETE FROM Doktorlar WHERE DoctorID = @DoctorID;
        DELETE FROM Kullanicilar WHERE UserID = @DoctorID; 
        
        PRINT 'Doktor (ID: ' + CAST(@DoctorID AS VARCHAR(10)) + ') baþarýyla silindi (aktif randevusu yoktu).';
    END
END
GO

PRINT 'Trigger trg_PreventDoctorDeletion baþarýyla oluþturuldu.';