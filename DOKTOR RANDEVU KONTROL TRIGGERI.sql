-- =============================================
-- Yeni Trigger: trg_CheckDuplicateAppointment
-- Randevular tablosuna yeni kayýt eklenmeden önce,
-- ayný doktor için ayný tarih ve saatte baþka bir randevu
-- olup olmadýðýný kontrol eder. Varsa eklemeyi engeller.
-- =============================================
IF OBJECT_ID('trg_CheckDuplicateAppointment', 'TR') IS NOT NULL
    DROP TRIGGER trg_CheckDuplicateAppointment;
GO

CREATE TRIGGER trg_CheckDuplicateAppointment
ON dbo.Randevular
INSTEAD OF INSERT -- INSERT iþlemi yerine çalýþýr
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DoctorID INT;
    DECLARE @AppointmentDate DATE;
    DECLARE @AppointmentTime TIME;
    DECLARE @ExistingAppointmentCount INT;

    -- Eklenmeye çalýþýlan randevunun bilgilerini al
    SELECT
        @DoctorID = i.DoctorID,
        @AppointmentDate = i.AppointmentDate,
        @AppointmentTime = i.AppointmentTime
    FROM inserted AS i;

    -- Ayný doktor, tarih ve saatte baþka bir randevu var mý kontrol et
    -- (Ýptal edilmiþ olanlarý sayma)
    SELECT @ExistingAppointmentCount = COUNT(*)
    FROM Randevular
    WHERE DoctorID = @DoctorID
      AND AppointmentDate = @AppointmentDate
      AND AppointmentTime = @AppointmentTime
      AND Status <> 'Ýptal Edildi';

    -- Eðer baþka bir randevu yoksa, ekleme iþlemine izin ver
    IF @ExistingAppointmentCount = 0
    BEGIN
        INSERT INTO Randevular (PatientID, DoctorID, SecretaryID, AppointmentDate, AppointmentTime, Complaint, Status, CreationDate)
        SELECT PatientID, DoctorID, SecretaryID, AppointmentDate, AppointmentTime, Complaint, Status, CreationDate
        FROM inserted;

        PRINT 'Randevu baþarýyla eklendi (çakýþma yok).';
    END
    ELSE
    BEGIN
        -- Eðer çakýþan randevu varsa, hata ver ve eklemeyi engelle
        DECLARE @ErrorMessage NVARCHAR(200);
        SET @ErrorMessage = FORMATMESSAGE('Bu doktor için %s tarihinde %s saatinde zaten bir randevu bulunmaktadýr.',
                                         CONVERT(NVARCHAR, @AppointmentDate, 104), -- Tarihi gg.aa.yyyy formatýnda göster
                                         CONVERT(NVARCHAR(5), @AppointmentTime, 108)); -- Saati SS:dd formatýnda göster
        RAISERROR (@ErrorMessage, 16, 1);
        RETURN; -- Ekleme iþlemini yapma
    END
END
GO

PRINT 'Trigger trg_CheckDuplicateAppointment baþarýyla oluþturuldu.';