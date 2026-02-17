-- =============================================
-- View 1: view_GunlukRandevuListesi
-- Belirli bir tarihteki randevularý hasta adý, doktor adý,
-- departman ve saat bilgileriyle birlikte gösterir.
-- =============================================
IF OBJECT_ID('view_GunlukRandevuListesi', 'V') IS NOT NULL
    DROP VIEW view_GunlukRandevuListesi;
GO

CREATE VIEW view_GunlukRandevuListesi AS
SELECT
    r.AppointmentID,
    r.AppointmentDate,
    r.AppointmentTime,
    r.Status,
    p_k.FirstName AS HastaAdi,
    p_k.LastName AS HastaSoyadi,
    d_k.FirstName AS DoktorAdi,
    d_k.LastName AS DoktorSoyadi,
    dep.DepartmentName
FROM
    Randevular AS r
JOIN
    Hastalar AS h ON r.PatientID = h.PatientID
JOIN
    Kullanicilar AS p_k ON h.PatientID = p_k.UserID
JOIN
    Doktorlar AS d ON r.DoctorID = d.DoctorID
JOIN
    Kullanicilar AS d_k ON d.DoctorID = d_k.UserID
JOIN
    Departmanlar AS dep ON d.DepartmentID = dep.DepartmentID;
GO

PRINT 'View view_GunlukRandevuListesi baþarýyla oluþturuldu.';