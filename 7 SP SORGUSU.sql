-- ===================================================================
-- BÖLÜM 1: İLK 7 TEMEL STORED PROCEDURE (Tekrar Gözden Geçirilmiş İlk Hali)
-- ===================================================================

-- Önce mevcutları silelim (varsa)
IF OBJECT_ID('sp_LoginUser', 'P') IS NOT NULL DROP PROCEDURE sp_LoginUser;
GO 
IF OBJECT_ID('sp_PatientRegister', 'P') IS NOT NULL DROP PROCEDURE sp_PatientRegister;
GO 
IF OBJECT_ID('sp_AddAppointment', 'P') IS NOT NULL DROP PROCEDURE sp_AddAppointment;
GO 
IF OBJECT_ID('sp_PatientAppointments', 'P') IS NOT NULL DROP PROCEDURE sp_PatientAppointments;
GO 
IF OBJECT_ID('sp_GetDoctorAppointments', 'P') IS NOT NULL DROP PROCEDURE sp_GetDoctorAppointments;
GO 
IF OBJECT_ID('sp_AddTibbiKayit', 'P') IS NOT NULL DROP PROCEDURE sp_AddTibbiKayit;
GO 
IF OBJECT_ID('sp_UpdateLabResult', 'P') IS NOT NULL DROP PROCEDURE sp_UpdateLabResult;
GO 

-- Şimdi prosedürleri oluşturalım

-- ==============================================
-- 1️⃣ sp_LoginUser (Tekrar Güncelleme - Esnek Versiyon)
-- ==============================================
IF OBJECT_ID('sp_LoginUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_LoginUser;
GO

CREATE PROCEDURE sp_LoginUser
    @Identifier NVARCHAR(50), -- TC No VEYA Username
    @Password NVARCHAR(255),
    @LoginType NVARCHAR(10) -- 'Hasta' veya 'Personel'
AS
BEGIN
    SET NOCOUNT ON;
    IF @LoginType = 'Hasta'
    BEGIN
        SELECT 
            k.UserID, k.RoleID, k.FirstName, k.LastName, k.Email, k.Gender
        FROM Kullanicilar AS k INNER JOIN Hastalar AS h ON k.UserID = h.PatientID
        WHERE h.TCNo = @Identifier AND k.PasswordHash = @Password AND k.IsActive = 1;
    END
    ELSE IF @LoginType = 'Personel'
    BEGIN
        SELECT 
            k.UserID, k.RoleID, k.FirstName, k.LastName, k.Email, k.Gender
        FROM Kullanicilar AS k
        WHERE k.Username = @Identifier AND k.PasswordHash = @Password AND k.IsActive = 1 AND k.RoleID <> 3;
    END
END;
GO

PRINT 'sp_LoginUser prosedürü hem Hasta hem Personel girişi için güncellendi.';
GO
-- ==============================================
-- 2️⃣ sp_PatientRegister (Daha Detaylı Hata Mesajı ile)
-- ==============================================
IF OBJECT_ID('sp_PatientRegister', 'P') IS NOT NULL 
    DROP PROCEDURE sp_PatientRegister;
GO 

CREATE PROCEDURE sp_PatientRegister
    @FirstName NVARCHAR(50), @LastName NVARCHAR(50), @TCNo VARCHAR(11), 
    @Gender NVARCHAR(10), @DateOfBirth DATE, @Username NVARCHAR(50), 
    @Password NVARCHAR(255), @Email NVARCHAR(100), @PhoneNumber VARCHAR(15)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION; 
    BEGIN TRY
        -- TCNo format kontrolü (opsiyonel ama güvenli)
        IF (LEN(@TCNo) <> 11 OR ISNUMERIC(@TCNo) <> 1)
        BEGIN
            RAISERROR('TC Kimlik Numarası 11 haneli ve rakamlardan oluşmalıdır.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END

        INSERT INTO Kullanicilar (RoleID, Username, PasswordHash, FirstName, LastName, Email, PhoneNumber, Gender)
        VALUES ((SELECT RoleID FROM Roller WHERE RoleName = 'Hasta'), @Username, @Password, @FirstName, @LastName, @Email, @PhoneNumber, @Gender);
        
        DECLARE @NewUserID INT = SCOPE_IDENTITY();
        
        INSERT INTO Hastalar (PatientID, TCNo, DateOfBirth) VALUES (@NewUserID, @TCNo, @DateOfBirth);
        
        COMMIT TRANSACTION; 
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION; 
        -- Daha detaylı hata mesajı döndür
        DECLARE @ErrorMessage NVARCHAR(MAX) = ERROR_MESSAGE(); -- Gerçek hatayı yakala
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        -- Hata mesajına ek bilgi ekleyebiliriz
        SET @ErrorMessage = 'Hasta kaydı sırasında hata oluştu: ' + @ErrorMessage; -- Başına ek bilgi ekle
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState); -- Gerçek hatayı fırlat
    END CATCH
END;
GO

PRINT 'sp_PatientRegister prosedürü detaylı hata mesajı ile güncellendi.';
GO

-- =============================================
-- 3️⃣ sp_AddAppointment (CREATE olarak düzeltildi)
-- Hastanın oluşturduğu randevunun durumunu 'Beklemede' olarak ayarlar
-- =============================================
IF OBJECT_ID('sp_AddAppointment', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddAppointment;
GO

CREATE PROCEDURE sp_AddAppointment
    @PatientID INT,
    @DoctorID INT,
    @SecretaryID INT = NULL,
    @AppointmentDate DATE,
    @AppointmentTime TIME,
    @Complaint NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Randevular (PatientID, DoctorID, SecretaryID, AppointmentDate, AppointmentTime, Complaint, Status)
    VALUES (@PatientID, @DoctorID, @SecretaryID, @AppointmentDate, @AppointmentTime, @Complaint, 'Beklemede'); -- Durum: Beklemede
END
GO

PRINT 'sp_AddAppointment (Beklemede) başarıyla OLUŞTURULDU.';
GO
-- ==============================================
-- 4️⃣ sp_PatientAppointments
-- ==============================================
ALTER PROCEDURE sp_PatientAppointments
    @PatientID INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        r.AppointmentID, r.AppointmentDate, r.AppointmentTime, r.Status,
        d.Title + ' ' + k.FirstName + ' ' + k.LastName AS DoctorName,
        dep.DepartmentName
    FROM Randevular AS r
    JOIN Doktorlar AS d ON r.DoctorID = d.DoctorID
    JOIN Kullanicilar AS k ON d.UserID = k.UserID
    JOIN Departmanlar AS dep ON d.DepartmentID = dep.DepartmentID
    WHERE r.PatientID = @PatientID
    ORDER BY r.AppointmentDate DESC, r.AppointmentTime DESC;
END;
GO

-- =============================================
-- 5️⃣ sp_GetDoctorAppointments (CREATE olarak düzeltildi)
-- Doktorun SADECE 'Onaylandı' durumundaki randevuları görmesini sağlar
-- =============================================
ALTER PROCEDURE sp_GetDoctorAppointments  
    @DoctorID INT  
AS  
BEGIN  
    SET NOCOUNT ON;  
    SELECT   
        r.AppointmentID, r.AppointmentDate, r.AppointmentTime, r.Status,  
        k.FirstName + ' ' + k.LastName AS PatientName,  
        h.TCNo  
    FROM Randevular AS r  
    JOIN Hastalar AS h ON r.PatientID = h.PatientID  
    JOIN Kullanicilar AS k ON r.PatientID = k.UserID  
    WHERE   
        r.DoctorID = @DoctorID
        AND r.Status = 'Onaylandı'
    ORDER BY   
        r.AppointmentDate, r.AppointmentTime;  
END
GO
-- ==============================================
-- 6️⃣ sp_AddTibbiKayit
-- ==============================================
CREATE PROCEDURE sp_AddTibbiKayit
    @AppointmentID INT, @Diagnosis NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO TibbiKayitlar (AppointmentID, Diagnosis) VALUES (@AppointmentID, @Diagnosis);
END;
GO --<< AYRAÇ

-- ==============================================
-- 7️⃣ sp_UpdateLabResult
-- ==============================================
CREATE PROCEDURE sp_UpdateLabResult
    @RecordID INT, @LabTechnicianID INT, @TestName NVARCHAR(100), 
    @Results NVARCHAR(MAX), @ResultDate DATETIME, @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM LaboratuvarTestleri WHERE RecordID = @RecordID AND TestName = @TestName)
    BEGIN
        UPDATE LaboratuvarTestleri
        SET LabTechnicianID = @LabTechnicianID, Results = @Results, ResultDate = @ResultDate, Status = @Status
        WHERE RecordID = @RecordID AND TestName = @TestName;
    END
    ELSE
    BEGIN
        INSERT INTO LaboratuvarTestleri (RecordID, LabTechnicianID, TestName, Results, ResultDate, Status)
        VALUES (@RecordID, @LabTechnicianID, @TestName, @Results, @ResultDate, @Status);
    END
END;
GO --<< AYRAÇ

PRINT 'İlk 7 Stored Procedure orijinal halleriyle başarıyla oluşturuldu/güncellendi.';
GO --<< SON AYRAÇ