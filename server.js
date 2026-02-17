// Gerekli paketleri içeri aktar
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

// --- VERİTABANI BİLGİLERİ DOĞRUDAN BURAYA YAZILDI ---
const dbConfig = {
    user: '',
    password: '', 
    server: '127.0.0.1',
    database: 'OZER_HOSPITAL',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};
// --------------------------------------------------------

// Express uygulamasını oluştur
const app = express();
const port = 3000;

// Middleware'leri kullan
app.use(cors());
app.use(express.json());

// ==========================================================
// API ENDPOINTS (API UÇ NOKTALARI)
// ==========================================================

// Ana test route'u
app.get('/', (req, res) => {
    res.send('Hastane Otomasyonu API Sunucusu Çalışıyor!');
});

// 1. Yeni Hasta Kaydı (Register)
app.post('/api/register', async (req, res) => {
    try {
        const { 
            FirstName, LastName, TCNo, Gender, DateOfBirth, 
            Username, Password, Email, PhoneNumber 
        } = req.body;

        const db = req.app.locals.db;

        await db.request()
            .input('FirstName', sql.NVarChar(50), FirstName)
            .input('LastName', sql.NVarChar(50), LastName)
            .input('TCNo', sql.VarChar(11), TCNo)
            .input('Gender', sql.NVarChar(10), Gender)
            .input('DateOfBirth', sql.Date, DateOfBirth)
            .input('Username', sql.NVarChar(50), Username)
            .input('Password', sql.NVarChar(255), Password)
            .input('Email', sql.NVarChar(100), Email)
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber)
            .execute('sp_PatientRegister');

        res.status(201).send({ message: 'Hasta başarıyla kaydedildi.' });

    } catch (error) {
        console.error('Kayıt sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 2. Kullanıcı Girişi (Login - Hem Hasta Hem Personel İçin ESNEK VERSİYON)
app.post('/api/login', async (req, res) => {
    try {
        const { TCNo, Username, Password } = req.body; 
        const db = req.app.locals.db;
        let identifier = '';
        let loginType = '';

        if (TCNo) {
            identifier = TCNo;
            loginType = 'Hasta';
        } else if (Username) {
            identifier = Username;
            loginType = 'Personel';
        } else {
            return res.status(400).send({ message: 'TC Kimlik Numarası veya Kullanıcı Adı gereklidir.' });
        }
        if (!Password) {
            return res.status(400).send({ message: 'Şifre alanı zorunludur.' });
        }

        const result = await db.request()
            .input('Identifier', sql.NVarChar(50), identifier) 
            .input('Password', sql.NVarChar(255), Password)
            .input('LoginType', sql.NVarChar(10), loginType)
            .execute('sp_LoginUser');

        if (result.recordset.length > 0) {
            console.log('Giriş Başarılı:', result.recordset[0]);
            res.status(200).send(result.recordset[0]);
        } else {
            console.log('Giriş Başarısız: Kimlik bilgisi veya şifre yanlış.');
            res.status(401).send({ message: 'Kimlik bilgisi veya şifre hatalı.' }); 
        }
    } catch (error) {
        console.error('*** Giriş sırasında hata:', error); 
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 3. Yeni Randevu Oluşturma (HASTA - /randevu-al)
app.post('/api/appointments', async (req, res) => {
    try {
        const { PatientID, DoctorID, AppointmentDate, AppointmentTime, Complaint } = req.body;
        const db = req.app.locals.db;

        if (!PatientID || !DoctorID || !AppointmentDate || !AppointmentTime) {
            return res.status(400).send({ message: 'Eksik bilgi.' });
        }

        console.log('📍 Gelen DoctorID (UserID):', DoctorID);
        console.log('⏰ Gelen AppointmentTime:', AppointmentTime);

        // ⭐ UserID'den DoctorID'yi bul
        const doctorResult = await db.request()
            .input('UserID', sql.Int, DoctorID)
            .query(`SELECT DoctorID FROM Doktorlar WHERE UserID = @UserID`);

        if (doctorResult.recordset.length === 0) {
            return res.status(400).send({ message: 'Doktor bulunamadı!' });
        }

        const realDoctorID = doctorResult.recordset[0].DoctorID;
        console.log('✅ Gerçek DoctorID:', realDoctorID);

        await db.request()
            .input('PatientID', sql.Int, PatientID)
            .input('DoctorID', sql.Int, realDoctorID)
            .input('AppointmentDate', sql.Date, AppointmentDate)
            .input('AppointmentTime', sql.NVarChar, AppointmentTime)  // ← NVarChar kullan!
            .input('Complaint', sql.NVarChar(sql.MAX), Complaint)
            .execute('sp_AddAppointment');

        console.log('✅ RANDEVU OLUŞTURULDU!');
        res.status(201).send({ message: 'Randevu başarıyla oluşturuldu.' });

    } catch (error) {
        console.error('❌ Randevu oluşturma hatası:', error.message);
        res.status(500).send({ message: 'Sunucu hatası oluştu: ' + error.message });
    }
});
// 4. Bir Hastanın Tüm Randevularını Listeleme
app.get('/api/patients/:patientId/appointments', async (req, res) => {
    try {
        const { patientId } = req.params;
        const db = req.app.locals.db;

        console.log(`📞 /api/patients/${patientId}/appointments çağrıldı`);

        const result = await db.request()
            .input('PatientID', sql.Int, patientId)
            .execute('sp_PatientAppointments');

        console.log(`📊 ${patientId} için ${result.recordset.length} randevu bulundu`);
        result.recordset.forEach((apt, i) => {
            console.log(`  ${i+1}. Randevu:`, {
                AppointmentID: apt.AppointmentID,
                Date: apt.AppointmentDate,
                Time: apt.AppointmentTime,
                Department: apt.DepartmentName,
                Status: apt.Status
            });
        });

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('❌ Hasta randevuları hatası:', error.message);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});


// ==========================================================
// 5. Bir Doktorun Randevularını Listeleme - DOKTOR ID İLE
// ==========================================================
app.get('/api/doctors/:doctorId/appointments', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;
        const db = req.app.locals.db;

        console.log(`👨‍⚕️ DOKTOR RANDEVULARI - DoctorID: ${doctorId}, Tarih: ${date || 'Tümü'}`);

        if (date) {
            // Tarihe göre filtrele
            console.log(`📅 Tarih filtresi: ${date}`);
            const result = await db.request()
                .input('DoctorID', sql.Int, doctorId)
                .input('AppointmentDate', sql.Date, date)
                .execute('sp_GetDoctorAppointmentsByDate');
            
            console.log(`📊 Tarihe göre ${result.recordset.length} randevu bulundu`);
            res.status(200).send(result.recordset);
        } else {
            // Tüm randevular
            console.log(`📋 Tüm randevular isteniyor`);
            const result = await db.request()
                .input('DoctorID', sql.Int, doctorId)
                .execute('sp_GetDoctorAppointments');
            
            console.log(`📈 Toplam ${result.recordset.length} randevu bulundu`);
            
            // DEBUG için
            if (result.recordset.length > 0) {
                result.recordset.forEach((apt, i) => {
                    console.log(`  ${i+1}. Randevu:`, {
                        ID: apt.AppointmentID,
                        Date: apt.AppointmentDate,
                        Time: apt.AppointmentTime,
                        Status: apt.Status,
                        Patient: apt.PatientName || 'Bilinmeyen'
                    });
                });
            } else {
                console.log('⚠️ Hiç randevu bulunamadı');
                // Test için - tüm status'leri getir
                const allAppointments = await db.request()
                    .input('DoctorID', sql.Int, doctorId)
                    .query(`
                        SELECT * FROM Randevular 
                        WHERE DoctorID = @DoctorID 
                        ORDER BY AppointmentDate DESC
                    `);
                console.log(`🔍 Tüm status'lerde ${allAppointments.recordset.length} randevu var`);
            }
            
            res.status(200).send(result.recordset);
        }

    } catch (error) {
        console.error('❌ Doktor randevuları hatası:', error.message);
        res.status(500).send({ 
            message: 'Doktor randevuları alınırken hata oluştu.',
            error: error.message 
        });
    }
});
// 6. Tıbbi Kayıt (Teşhis) Ekleme
app.post('/api/medical-records', async (req, res) => {
    try {
        const { AppointmentID, Diagnosis } = req.body;
        const db = req.app.locals.db;

        if (!AppointmentID || !Diagnosis) {
            return res.status(400).send({ message: 'Eksik bilgi: AppointmentID ve Diagnosis alanları zorunludur.' });
        }

        await db.request()
            .input('AppointmentID', sql.Int, AppointmentID)
            .input('Diagnosis', sql.NVarChar(sql.MAX), Diagnosis)
            .execute('sp_AddTibbiKayit');

        res.status(201).send({ message: 'Tıbbi kayıt başarıyla oluşturuldu.' });

    } catch (error) {
        console.error('Tıbbi kayıt oluşturma sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 7. Laboratuvar Sonucu Ekleme/Güncelleme
app.post('/api/lab-results', async (req, res) => {
    try {
        const { RecordID, LabTechnicianID, TestName, Results, Status } = req.body;
        const db = req.app.locals.db;

        if (!RecordID || !TestName || !Results || !Status) {
            return res.status(400).send({ message: 'Eksik bilgi: RecordID, TestName, Results ve Status alanları zorunludur.' });
        }

        await db.request()
            .input('RecordID', sql.Int, RecordID)
            .input('LabTechnicianID', sql.Int, LabTechnicianID)
            .input('TestName', sql.NVarChar(100), TestName)
            .input('Results', sql.NVarChar(sql.MAX), Results)
            .input('ResultDate', sql.DateTime, new Date())
            .input('Status', sql.NVarChar(20), Status)
            .execute('sp_UpdateLabResult');

        res.status(200).send({ message: 'Laboratuvar sonucu başarıyla kaydedildi.' });

    } catch (error) {
        console.error('Laboratuvar sonucu kaydı sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 8. Bir Tıbbi Kayda Reçete Ekleme
app.post('/api/prescriptions', async (req, res) => {
    try {
        const { RecordID, Details } = req.body;
        const db = req.app.locals.db;

        if (!RecordID || !Details) {
            return res.status(400).send({ message: 'Eksik bilgi: RecordID ve Details alanları zorunludur.' });
        }

        await db.request()
            .input('RecordID', sql.Int, RecordID)
            .input('Details', sql.NVarChar(sql.MAX), Details)
            .execute('sp_AddPrescription');

        res.status(201).send({ message: 'Reçete başarıyla eklendi.' });

    } catch (error) {
        if (error.number === 50001) {
            return res.status(404).send({ message: error.message });
        }
        console.error('Reçete ekleme sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 9. Bir Hastanın Tüm Reçetelerini Listeleme
app.get('/api/patients/:patientId/prescriptions', async (req, res) => {
    try {
        const { patientId } = req.params;
        const db = req.app.locals.db;

        // ⭐ SP yerine direkt sorgu
        const result = await db.request()
            .input('PatientID', sql.Int, patientId)
            .query(`
                SELECT
                    tk.RecordID,
                    tk.Diagnosis AS Details,
                    tk.RecordDate AS PrescriptionDate,
                    r.AppointmentDate,
                    doc_k.FirstName + ' ' + doc_k.LastName AS DoctorName,
                    doc_k.Email AS DoctorEmail,
                    doc.Title AS DoctorTitle,
                    dep.DepartmentName
                FROM TibbiKayitlar tk
                INNER JOIN Randevular r ON tk.AppointmentID = r.AppointmentID
                INNER JOIN Doktorlar doc ON r.DoctorID = doc.DoctorID
                INNER JOIN Kullanicilar doc_k ON doc.UserID = doc_k.UserID
                INNER JOIN Departmanlar dep ON doc.DepartmentID = dep.DepartmentID
                WHERE r.PatientID = @PatientID
                    AND tk.Diagnosis LIKE 'Reçete:%'
                ORDER BY tk.RecordDate DESC
            `);

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Hasta reçeteleri listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 10. Yeni Doktor Ekleme (Admin Yetkisi)
app.post('/api/doctors', async (req, res) => {
    try {
        const { 
            FirstName, LastName, Username, Password, Email, 
            Gender, DepartmentID, Title 
        } = req.body;
        
        const db = req.app.locals.db;

        await db.request()
            .input('FirstName', sql.NVarChar(50), FirstName)
            .input('LastName', sql.NVarChar(50), LastName)
            .input('Username', sql.NVarChar(50), Username)
            .input('Password', sql.NVarChar(255), Password)
            .input('Email', sql.NVarChar(100), Email)
            .input('Gender', sql.NVarChar(10), Gender)
            .input('DepartmentID', sql.Int, DepartmentID)
            .input('Title', sql.NVarChar(50), Title)
            .execute('sp_AddDoctor');

        res.status(201).send({ message: 'Doktor başarıyla sisteme eklendi.' });

    } catch (error) {
        console.error('Doktor ekleme sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 11. Hasta Bilgilerini Güncelleme
app.put('/api/patients/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { Email, PhoneNumber, Address } = req.body;
        const db = req.app.locals.db;

        await db.request()
            .input('PatientID', sql.Int, patientId)
            .input('Email', sql.NVarChar(100), Email)
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber)
            .input('Address', sql.NVarChar(sql.MAX), Address)
            .execute('sp_UpdatePatientInfo');

        res.status(200).send({ message: 'Hasta bilgileri başarıyla güncellendi.' });

    } catch (error) {
        console.error('Hasta bilgileri güncellenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 12. Admin Raporlarını Görüntüleme
app.get('/api/admin/reports', async (req, res) => {
    try {
        const db = req.app.locals.db;

        const result = await db.request()
            .execute('sp_AdminReports');

        res.status(200).send(result.recordset[0]);

    } catch (error) {
        console.error('Admin raporu oluşturulurken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 13. Sekreter Tarafından Yeni Randevu Ekleme
app.post('/api/secretary/appointments', async (req, res) => {
    try {
        const { PatientID, DoctorID, AppointmentDate, AppointmentTime, Complaint } = req.body;
        const db = req.app.locals.db;

        if (!PatientID || !DoctorID || !AppointmentDate || !AppointmentTime) {
            return res.status(400).send({ message: 'Eksik bilgi: PatientID, DoctorID, AppointmentDate ve AppointmentTime alanları zorunludur.' });
        }

        await db.request()
            .input('PatientID', sql.Int, PatientID)
            .input('DoctorID', sql.Int, DoctorID)
            .input('AppointmentDate', sql.Date, AppointmentDate)
            .input('AppointmentTime', sql.NVarChar, AppointmentTime)
            .input('Complaint', sql.NVarChar(sql.MAX), Complaint)
            .execute('sp_AddAppointmentBySecretary');

        res.status(201).send({ message: 'Randevu sekreter tarafından başarıyla oluşturuldu.' });

    } catch (error) {
        console.error('Sekreter randevu oluştururken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 14. Sekreter Tarafından Randevu Güncelleme (Tarih, Saat, Durum)
app.put('/api/secretary/appointments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { NewAppointmentDate, NewAppointmentTime, NewStatus } = req.body;
        const db = req.app.locals.db;

        if (!NewAppointmentDate || !NewAppointmentTime || !NewStatus) {
            return res.status(400).send({ message: 'Eksik bilgi: NewAppointmentDate, NewAppointmentTime ve NewStatus alanları zorunludur.' });
        }

        await db.request()
            .input('AppointmentID', sql.Int, id)
            .input('NewAppointmentDate', sql.Date, NewAppointmentDate)
            .input('NewAppointmentTime', sql.NVarChar, NewAppointmentTime)
            .input('NewStatus', sql.NVarChar(20), NewStatus)
            .execute('sp_UpdateAppointmentBySecretary');

        res.status(200).send({ message: 'Randevu başarıyla güncellendi.' });

    } catch (error) {
        console.error('Sekreter randevu güncellerken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 15. Belirli Bir Tarihteki Tüm Randevuları Listeleme (Sekreter için)
app.get('/api/appointments', async (req, res) => {
    try {
        const { date } = req.query; 
        const db = req.app.locals.db;

        if (!date) {
            return res.status(400).send({ message: 'Tarih parametresi (`date`) zorunludur.' });
        }

        const result = await db.request()
            .input('RequestDate', sql.Date, date)
            .execute('sp_GetAllAppointmentsByDate');

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Günlük randevular listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
//16  Hastanın Laboratuvar Sonuçlarını Listeleme
app.get('/api/patients/:id/lab-results', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        // ⭐ DOĞRUDAN SORGU (SP yerine)
        const result = await db.request()
            .input('PatientID', sql.Int, id)
            .query(`
                SELECT 
                    lt.TestID,
                    lt.TestName,
                    lt.RequestDate,
                    lt.ResultDate,
                    lt.Results,
                    lt.Status
                FROM LaboratuvarTestleri lt
                INNER JOIN TibbiKayitlar tk ON lt.RecordID = tk.RecordID
                INNER JOIN Randevular r ON tk.AppointmentID = r.AppointmentID
                WHERE r.PatientID = @PatientID
                ORDER BY lt.RequestDate DESC
            `);

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Hasta laboratuvar sonuçları hatası:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 17. Doktorun Laboratuvar Sonuçlarını Görüntülemesi
app.get('/api/medical-records/:id/lab-results', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('RecordID', sql.Int, id)
            .execute('sp_DoctorViewLabResults');

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Doktor laboratuvar sonuçları listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 18. Hasta Arama Endpoint'i (Doktorlar kullanacak)
app.get('/api/patients/search', async (req, res) => {
    try {
        const { term } = req.query;
        const db = req.app.locals.db;

        if (!term || term.trim().length < 2) { 
            return res.status(400).send({ message: 'Arama yapmak için en az 2 karakter giriniz.' });
        }

        const result = await db.request()
            .input('SearchTerm', sql.NVarChar(100), term.trim()) 
            .execute('sp_SearchPatients');

        res.status(200).send(result.recordset); 

    } catch (error) {
        console.error('Hasta arama sırasında hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 19. Hastanın Tıbbi Kayıtlarını (Teşhislerini) Listeleme
app.get('/api/patients/:id/medical-records', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('PatientID', sql.Int, id)
            .execute('sp_GetPatientMedicalRecords');

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Hastanın tıbbi kayıtları listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 20. Tüm departmanları listele
app.get('/api/departments', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const result = await db.request().execute('sp_GetDepartments');
        res.status(200).send(result.recordset);
    } catch (error) {
        console.error('Departmanlar listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 21. Bir departmandaki doktorları listele
app.get('/api/departments/:id/doctors', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        if (!id) {
            return res.status(400).send({ message: 'Departman ID gereklidir.' });
        }

        console.log('📞 Doktorlar çekiliyor, Departman:', id);

        const result = await db.request()
            .input('DepartmentID', sql.Int, id)
            .query(`
                SELECT 
                    k.UserID AS DoctorID,
                    d.Title + ' ' + k.FirstName + ' ' + k.LastName AS DoctorName
                FROM Doktorlar AS d
                INNER JOIN Kullanicilar AS k ON d.UserID = k.UserID
                WHERE 
                    d.DepartmentID = @DepartmentID 
                    AND k.IsActive = 1
                ORDER BY 
                    k.LastName
            `);
        
        console.log(`✅ ${result.recordset.length} doktor bulundu`);
        res.status(200).send(result.recordset);
        
    } catch (error) {
        console.error('❌ Doktor hatası:', error.message);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 22. Doktorun dolu saatlerini (müsaitlik durumunu) getir
app.get('/api/doctors/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        const db = req.app.locals.db;

        if (!date) {
            return res.status(400).send({ message: 'Tarih parametresi (`date`) zorunludur.' });
        }

        console.log(`📊 Doktor ${id} için ${date} tarihindeki müsaitlik kontrolü`);
        
        const result = await db.request()
            .input('DoctorID', sql.Int, id)
            .input('AppointmentDate', sql.Date, date)
            .execute('sp_GetDoctorAvailability');
        
        console.log('📦 Stored Procedure RAW sonucu:');
        console.log('- Recordset:', result.recordset);
        console.log('- İlk kayıt:', result.recordset[0]);
        
        if (result.recordset.length > 0) {
            console.log('🎯 İlk kayıt detayı:', {
                AppointmentTime: result.recordset[0].AppointmentTime,
                Type: typeof result.recordset[0].AppointmentTime,
                IsDate: result.recordset[0].AppointmentTime instanceof Date,
                String: String(result.recordset[0].AppointmentTime),
                TimeString: result.recordset[0].AppointmentTime?.toTimeString?.(),
                ISOString: result.recordset[0].AppointmentTime?.toISOString?.(),
                GetHours: result.recordset[0].AppointmentTime?.getHours?.(),
                GetUTCHours: result.recordset[0].AppointmentTime?.getUTCHours?.(),
                GetMinutes: result.recordset[0].AppointmentTime?.getMinutes?.(),
                GetUTCMinutes: result.recordset[0].AppointmentTime?.getUTCMinutes?.()
            });
        }
        
        // YENİ VE DOĞRU ÇEVİRME YÖNTEMİ
        const takenSlots = result.recordset.map(slot => {
            if (!slot.AppointmentTime) return null;
            
            let hour, minute;
            
            if (slot.AppointmentTime instanceof Date) {
                // SQL Server Date objesi geldiyse
                // BU CRITICAL: getUTCHours() yerine getHours() kullan!
                hour = slot.AppointmentTime.getHours(); // Local hour
                minute = slot.AppointmentTime.getMinutes();
                console.log(`🕐 Date -> Local: ${hour}:${minute}`);
            } else if (typeof slot.AppointmentTime === 'string') {
                // String geldiyse
                const match = slot.AppointmentTime.match(/(\d{1,2}):(\d{2})/);
                if (match) {
                    hour = parseInt(match[1], 10);
                    minute = parseInt(match[2], 10);
                    console.log(`🕐 String -> Local: ${hour}:${minute} (from: ${slot.AppointmentTime})`);
                } else {
                    return null;
                }
            } else {
                return null;
            }
            
            // Saati HH:MM:SS formatına çevir
            const formattedHour = String(hour).padStart(2, '0');
            const formattedMinute = String(minute).padStart(2, '0');
            const result = `${formattedHour}:${formattedMinute}:00`;
            
            console.log(`✅ Çevrilen saat: ${result}`);
            return result;
            
        }).filter(time => time !== null);
        
        console.log('✅ Backend gönderilen dolu saatler:', takenSlots);
        res.status(200).send(takenSlots);
        
    } catch (error) {
        console.error('❌ Doktor müsaitlik durumu alınırken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 23. Hastanın Randevu İptal Etmesi
app.put('/api/patients/:patientId/appointments/:appointmentId', async (req, res) => {
    try {
        const { patientId, appointmentId } = req.params;
        const { NewStatus } = req.body;

        if (NewStatus === 'İptal Edildi') {
            const db = req.app.locals.db;

            await db.request()
                .input('AppointmentID', sql.Int, appointmentId)
                .input('PatientID', sql.Int, patientId) 
                .execute('sp_DeleteAppointmentByPatient');

            res.status(200).send({ message: 'Randevu başarıyla silindi.' });

        } else {
            return res.status(400).send({ message: 'Geçersiz işlem. Hasta sadece iptal edebilir.' });
        }

    } catch (error) {
        console.error('Hasta randevu iptal/silme hatası:', error);
        if (error.originalError && error.originalError.info) {
             res.status(400).send({ message: error.originalError.info.message });
        } else {
             res.status(500).send({ message: 'Sunucu hatası oluştu.' });
        }
    }
});
// 24. Laborant'a ait testleri listele - BU DOĞRU
app.get('/api/lab/tests', async (req, res) => {
    try {
        const { technicianId, status } = req.query;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('TechnicianID', sql.Int, technicianId || null)
            .input('Status', sql.NVarChar(20), status || null)
            .execute('sp_GetLabTests');

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Laboratuvar testleri listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});

// 25. Tek laboratuvar testi detayı - YENİ EKLE
app.get('/api/lab/tests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('TestID', sql.Int, id)
            .execute('sp_GetLabTestDetails');

        if (result.recordset.length === 0) {
            return res.status(404).send({ message: 'Test bulunamadı.' });
        }

        res.status(200).send(result.recordset[0]);

    } catch (error) {
        console.error('Test detayı alınırken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// Otomatik laboratuvar sonucu üretme fonksiyonu (GERÇEKÇI VERSİYON)
function generateAutoLabResult(testName) {
    const testName_lower = testName.toLowerCase();
    
    // %70 normal, %30 anormal değer üret
    const isAbnormal = Math.random() < 0.3;
    
    // Kan Testleri
    if (testName_lower.includes('hemogram') || testName_lower.includes('tam kan')) {
        const wbc = isAbnormal && Math.random() < 0.5 
            ? (Math.random() * 5 + 11).toFixed(2)  // Yüksek
            : (Math.random() * 3 + 6).toFixed(2);   // Normal
        
        const hgb = isAbnormal && Math.random() < 0.5
            ? (Math.random() * 2 + 10).toFixed(1)   // Düşük (anemi)
            : (Math.random() * 3 + 13).toFixed(1);  // Normal
        
        const plt = isAbnormal && Math.random() < 0.5
            ? Math.floor(Math.random() * 50000 + 100000)  // Düşük
            : Math.floor(Math.random() * 100000 + 200000); // Normal
        
        const abnormalFlags = [];
        if (parseFloat(wbc) > 10) abnormalFlags.push('⚠️ Lökosit yüksek');
        if (parseFloat(hgb) < 13) abnormalFlags.push('⚠️ Hemoglobin düşük (Anemi)');
        if (plt < 150000) abnormalFlags.push('⚠️ Trombosit düşük');
        
        return {
            results: `
=== TAM KAN SAYIMI (HEMOGRAM) ===

LÖKOSIT (WBC): ${wbc} x10³/µL (Normal: 4-10) ${parseFloat(wbc) > 10 ? '🔴 YÜKSEK' : '✅'}
ERİTROSİT (RBC): ${(Math.random() * 1 + 4.5).toFixed(2)} x10⁶/µL (Normal: 4.5-5.5) ✅
HEMOGLOBİN (HGB): ${hgb} g/dL (Normal: 13-17) ${parseFloat(hgb) < 13 ? '🔴 DÜŞÜK' : '✅'}
HEMATOKRİT (HCT): ${(Math.random() * 10 + 40).toFixed(1)}% (Normal: 40-50%) ✅
TROMBOSIT (PLT): ${plt.toLocaleString()} x10³/µL (Normal: 150,000-400,000) ${plt < 150000 ? '🔴 DÜŞÜK' : '✅'}
MCV: ${(Math.random() * 10 + 80).toFixed(1)} fL (Normal: 80-100) ✅
MCH: ${(Math.random() * 5 + 27).toFixed(1)} pg (Normal: 27-32) ✅

${abnormalFlags.length > 0 ? '⚠️ ANORMAL BULGULAR:\n' + abnormalFlags.join('\n') : '✅ Sonuç: Tüm parametreler normal sınırlar içerisinde'}

${abnormalFlags.length > 0 ? 'ÖNERİ: Doktor değerlendirmesi önerilir.' : ''}
            `.trim()
        };
    }
    
    // Biyokimya
    if (testName_lower.includes('biyokimya') || testName_lower.includes('glukoz')) {
        const glucose = isAbnormal && Math.random() < 0.6
            ? Math.floor(Math.random() * 80 + 140)   // Yüksek (diyabet)
            : Math.floor(Math.random() * 30 + 80);   // Normal
        
        const creatinine = isAbnormal && Math.random() < 0.4
            ? (Math.random() * 1.5 + 1.5).toFixed(2) // Yüksek (böbrek)
            : (Math.random() * 0.5 + 0.7).toFixed(2); // Normal
        
        const ast = isAbnormal && Math.random() < 0.5
            ? Math.floor(Math.random() * 60 + 50)    // Yüksek (karaciğer)
            : Math.floor(Math.random() * 20 + 15);   // Normal
        
        const alt = isAbnormal && Math.random() < 0.5
            ? Math.floor(Math.random() * 70 + 60)    // Yüksek
            : Math.floor(Math.random() * 25 + 10);   // Normal
        
        const abnormalFlags = [];
        if (glucose > 125) abnormalFlags.push('⚠️ Açlık glukozu yüksek (Prediyabet/Diyabet)');
        if (parseFloat(creatinine) > 1.3) abnormalFlags.push('⚠️ Kreatinin yüksek (Böbrek fonksiyonu kontrolü)');
        if (ast > 40 || alt > 45) abnormalFlags.push('⚠️ Karaciğer enzimleri yüksek');
        
        return {
            results: `
=== BİYOKİMYA PANELİ ===

GLUKOZ: ${glucose} mg/dL (Normal: 70-110) ${glucose > 125 ? '🔴 YÜKSEK' : glucose > 110 ? '🟡 SINIRDAKİ' : '✅'}
ÜRE: ${Math.floor(Math.random() * 20 + 20)} mg/dL (Normal: 15-45) ✅
KREATİNİN: ${creatinine} mg/dL (Normal: 0.7-1.3) ${parseFloat(creatinine) > 1.3 ? '🔴 YÜKSEK' : '✅'}
AST (SGOT): ${ast} U/L (Normal: 5-40) ${ast > 40 ? '🔴 YÜKSEK' : '✅'}
ALT (SGPT): ${alt} U/L (Normal: 5-45) ${alt > 45 ? '🔴 YÜKSEK' : '✅'}
TOTAL BİLİRUBİN: ${(Math.random() * 0.5 + 0.5).toFixed(2)} mg/dL (Normal: 0.3-1.2) ✅
ALKALEN FOSFATAZ: ${Math.floor(Math.random() * 60 + 40)} U/L (Normal: 40-150) ✅

${abnormalFlags.length > 0 ? '⚠️ ANORMAL BULGULAR:\n' + abnormalFlags.join('\n') : '✅ Sonuç: Karaciğer ve böbrek fonksiyonları normal'}

${abnormalFlags.length > 0 ? '\n🏥 ACİL ÖNERİ: Doktor ile görüşünüz!' : ''}
            `.trim()
        };
    }
    
    // Lipid Profili
    if (testName_lower.includes('lipid') || testName_lower.includes('kolesterol')) {
        const totalChol = isAbnormal && Math.random() < 0.6
            ? Math.floor(Math.random() * 80 + 220)   // Yüksek
            : Math.floor(Math.random() * 50 + 160);  // Normal
        
        const ldl = isAbnormal && Math.random() < 0.6
            ? Math.floor(Math.random() * 50 + 150)   // Yüksek
            : Math.floor(Math.random() * 40 + 100);  // Normal
        
        const hdl = isAbnormal && Math.random() < 0.3
            ? Math.floor(Math.random() * 10 + 30)    // Düşük (kötü)
            : Math.floor(Math.random() * 20 + 50);   // İyi
        
        const triglyceride = isAbnormal && Math.random() < 0.5
            ? Math.floor(Math.random() * 150 + 200)  // Yüksek
            : Math.floor(Math.random() * 80 + 100);  // Normal
        
        const abnormalFlags = [];
        if (totalChol > 200) abnormalFlags.push('⚠️ Total kolesterol yüksek');
        if (ldl > 130) abnormalFlags.push('⚠️ LDL (kötü kolesterol) yüksek');
        if (hdl < 40) abnormalFlags.push('⚠️ HDL (iyi kolesterol) düşük');
        if (triglyceride > 150) abnormalFlags.push('⚠️ Trigliserit yüksek');
        
        return {
            results: `
=== LİPİD PROFİLİ ===

TOTAL KOLESTEROL: ${totalChol} mg/dL (Normal: <200) ${totalChol > 200 ? '🔴 YÜKSEK' : '✅'}
LDL KOLESTEROL: ${ldl} mg/dL (Normal: <130) ${ldl > 130 ? '🔴 YÜKSEK' : '✅'}
HDL KOLESTEROL: ${hdl} mg/dL (Normal: >40) ${hdl < 40 ? '🔴 DÜŞÜK' : '✅'}
TRİGLİSERİT: ${triglyceride} mg/dL (Normal: <150) ${triglyceride > 150 ? '🔴 YÜKSEK' : '✅'}
VLDL: ${Math.floor(triglyceride / 5)} mg/dL (Normal: <30) ✅

${abnormalFlags.length > 0 ? '⚠️ ANORMAL BULGULAR:\n' + abnormalFlags.join('\n') : '✅ Sonuç: Lipid değerleri normal sınırlarda'}

${totalChol > 240 || ldl > 160 ? '\n🚨 YÜKSEK RİSK: Kardiyolog konsültasyonu önerilir!' : ''}
${abnormalFlags.length > 0 && totalChol < 240 ? '\nÖNERİ: Diyet ve yaşam tarzı değişiklikleri önerilir.' : ''}
            `.trim()
        };
    }
    
    // Tiroid
    if (testName_lower.includes('tiroid') || testName_lower.includes('tsh')) {
        const tshValue = isAbnormal && Math.random() < 0.5
            ? Math.random() < 0.5 
                ? (Math.random() * 3 + 5).toFixed(3)   // Yüksek (hipotiroidi)
                : (Math.random() * 0.3 + 0.1).toFixed(3) // Düşük (hipertiroidi)
            : (Math.random() * 3 + 0.5).toFixed(3);      // Normal
        
        const tsh = parseFloat(tshValue);
        
        return {
            results: `
=== TİROİD FONKSİYON TESTLERİ ===

TSH: ${tshValue} mIU/L (Normal: 0.5-4.5) ${tsh > 4.5 ? '🔴 YÜKSEK' : tsh < 0.5 ? '🔴 DÜŞÜK' : '✅'}
sT3: ${(Math.random() * 1.5 + 2.0).toFixed(2)} pg/mL (Normal: 2.0-4.4) ✅
sT4: ${(Math.random() * 0.6 + 0.9).toFixed(2)} ng/dL (Normal: 0.9-1.7) ✅
Anti-TPO: ${Math.floor(Math.random() * 20 + 5)} IU/mL (Normal: <35) ✅

${tsh > 4.5 ? '⚠️ ANORMAL: TSH yüksek - HİPOTİROİDİ şüphesi\nÖNERİ: Endokrinoloji konsültasyonu' : ''}
${tsh < 0.5 ? '⚠️ ANORMAL: TSH düşük - HİPERTİROİDİ şüphesi\nÖNERİ: Endokrinoloji konsültasyonu' : ''}
${tsh >= 0.5 && tsh <= 4.5 ? '✅ Sonuç: Tiroid fonksiyonları normal' : ''}
            `.trim()
        };
    }
    
    // İdrar Analizi
    if (testName_lower.includes('idrar')) {
        const leukocyte = isAbnormal && Math.random() < 0.4
            ? Math.floor(Math.random() * 15 + 10)  // Yüksek (enfeksiyon)
            : Math.floor(Math.random() * 3);        // Normal
        
        const erythrocyte = isAbnormal && Math.random() < 0.3
            ? Math.floor(Math.random() * 10 + 5)   // Yüksek
            : Math.floor(Math.random() * 2);        // Normal
        
        const bacteria = isAbnormal && leukocyte > 5 ? 'Çok sayıda (+++)' : 'Görülmedi';
        
        return {
            results: `
=== TAM İDRAR ANALİZİ ===

RENK: Sarı
GÖRÜNÜM: ${bacteria !== 'Görülmedi' ? 'Bulanık' : 'Berrak'}
pH: ${(Math.random() * 2 + 5).toFixed(1)} (Normal: 5-7) ✅
DANSITE: ${(Math.random() * 0.015 + 1.010).toFixed(3)} (Normal: 1.010-1.030) ✅

MİKROSKOPİK:
Lökosit: ${leukocyte} /hpf (Normal: 0-5) ${leukocyte > 5 ? '🔴 YÜKSEK' : '✅'}
Eritrosit: ${erythrocyte} /hpf (Normal: 0-3) ${erythrocyte > 3 ? '🔴 YÜKSEK' : '✅'}
Epitel: Az miktarda
Kristal: Görülmedi
Bakteri: ${bacteria} ${bacteria !== 'Görülmedi' ? '🔴' : '✅'}

${leukocyte > 5 || bacteria !== 'Görülmedi' ? '⚠️ ANORMAL: İDRAR YOLU ENFEKSİYONU şüphesi\nÖNERİ: İdrar kültürü ve antibiyotik duyarlılık testi önerilir' : ''}
${leukocyte <= 5 && bacteria === 'Görülmedi' ? '✅ Sonuç: Patolojik bulgu saptanmadı' : ''}
            `.trim()
        };
    }
    
    // Genel/Bilinmeyen Test
    return {
        results: `
=== ${testName.toUpperCase()} ===

Test başarıyla tamamlandı.
Tüm parametreler değerlendirilmiştir.

📊 Sonuç: ${isAbnormal ? '⚠️ Bazı parametrelerde sınır dışı değerler\nDoktor değerlendirmesi önerilir' : '✅ Normal - Patolojik bulgu saptanmadı'}

Test Tarihi: ${new Date().toLocaleDateString('tr-TR')}
Laborant: Yusuf Demir
        `.trim()
    };
}

app.post('/api/lab/tests/:id/generate-result', async (req, res) => {
    try {
        const { id } = req.params;
        const { technicianId } = req.body;
        const db = req.app.locals.db;

        console.log('🚨 SONUÇ ÜRETİM:', id);

        // ⭐ DÜZELT: Direkt tablodan sor (SP yerine)
        const testInfo = await db.request()
            .input('TestID', sql.Int, id)
            .query(`
                SELECT 
                    lt.TestID,
                    lt.RecordID,
                    lt.LabTechnicianID,
                    lt.TestName,
                    lt.RequestDate,
                    lt.Status
                FROM LaboratuvarTestleri lt
                WHERE lt.TestID = @TestID
            `);
        
        if (testInfo.recordset.length === 0) {
            return res.status(404).send({ message: 'Test bulunamadı.' });
        }

        const test = testInfo.recordset[0];
        console.log('✅ Test bulundu:', test);
        
        // 2. Otomatik sonuç üret
        const autoResult = generateAutoLabResult(test.TestName);
        
        // 3. Güncelle
        await db.request()
            .input('RecordID', sql.Int, test.RecordID)
            .input('LabTechnicianID', sql.Int, technicianId || test.LabTechnicianID)
            .input('TestName', sql.NVarChar(100), test.TestName)
            .input('Results', sql.NVarChar(sql.MAX), autoResult.results)
            .input('ResultDate', sql.DateTime, new Date())
            .input('Status', sql.NVarChar(20), 'Sonuçlandı')
            .execute('sp_UpdateLabResult');

        console.log('✅ SONUÇ ÜRETİLDİ!');

        res.status(200).send({ 
            message: 'Test sonucu otomatik üretildi ve kaydedildi.',
            testId: id,
            results: autoResult
        });

    } catch (error) {
        console.error('❌ Sonuç üretme hatası:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 27. Mevcut kullanıcı bilgilerini getir (Frontend için)
app.get('/api/auth/me', async (req, res) => {
    try {
        // Not: Normalde token'dan userID alınır, şimdilik sabit değer
        const userId = req.headers['user-id'] || 4; // Yusuf Demir ID=4
        const db = req.app.locals.db;

        const result = await db.request()
            .input('UserID', sql.Int, userId)
            .execute('sp_GetUserInfo'); // Bu SP'yi oluşturman gerek

        if (result.recordset.length === 0) {
            return res.status(404).send({ message: 'Kullanıcı bulunamadı.' });
        }

        res.status(200).send({
            userId: result.recordset[0].UserID,
            firstName: result.recordset[0].FirstName,
            lastName: result.recordset[0].LastName,
            email: result.recordset[0].Email,
            role: result.recordset[0].RoleName,
            phoneNumber: result.recordset[0].PhoneNumber
        });

    } catch (error) {
        console.error('Kullanıcı bilgileri alınırken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 28. Belirli bir laboranta atanan testleri getir
app.get('/api/lab/technician/:id/tests', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('TechnicianID', sql.Int, id)
            .input('Status', sql.NVarChar(20), status || null)
            .execute('sp_GetLabTestsByTechnician');

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('Laborant testleri listelenirken hata:', error);
        res.status(500).send({ message: 'Sunucu hatası oluştu.' });
    }
});
// 29. Laborant testleri (tarih ve durum filtreli) - DEBUG VERSİYON
app.get('/api/lab/my-tests', async (req, res) => {
    console.log('🚨 /api/lab/my-tests çağrıldı');
    
    try {
        const technicianId = req.query.technicianId || 4;
        const filterDate = req.query.date;
        const filterStatus = req.query.status;
        const db = req.app.locals.db;

        console.log('📊 Parametreler:', {
            technicianId,
            filterDate,
            filterStatus
        });

        if (!db) {
            console.error('❌ Veritabanı bağlantısı yok!');
            return res.status(500).send({ 
                success: false,
                message: 'Veritabanı bağlantısı kurulamadı.' 
            });
        }

        // ÖNCE: Tabloları kontrol et
        console.log('🔍 Tablo yapısı kontrol ediliyor...');
        try {
            const tableCheck = await db.request()
                .query(`
                    SELECT 
                        TABLE_NAME,
                        COLUMN_NAME,
                        DATA_TYPE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME IN ('LaboratuvarTestleri', 'TibbiKayitlar', 'Hastalar', 'Doktorlar')
                    ORDER BY TABLE_NAME, ORDINAL_POSITION
                `);
            
            console.log('📋 Tablo yapısı:', tableCheck.recordset);
        } catch (tableError) {
            console.error('❌ Tablo kontrol hatası:', tableError.message);
        }

        // 1. ÖNCE BASİT BİR SORGULA
        console.log('🔍 Basit sorgu deniyor...');
        const simpleQuery = await db.request()
            .query(`
                SELECT 
                    TestID,
                    TestName,
                    Status,
                    LabTechnicianID,
                    RequestDate
                FROM LaboratuvarTestleri 
                WHERE LabTechnicianID = ${technicianId}
                ORDER BY RequestDate DESC
            `);
        
        console.log(`✅ Basit sorgu sonucu: ${simpleQuery.recordset.length} kayıt`);
        
        // 2. EĞER BASİT SORGUSU ÇALIŞIYORSA, DETAYLI SORGULA
        console.log('🔍 Detaylı sorgu deniyor...');
        
        // İLK JOIN'İ KONTROL ET
        let sqlQuery = `
            SELECT 
                t.TestID,
                t.TestName,
                t.RequestDate,
                t.ResultDate,
                t.Results,
                t.Status,
                t.LabTechnicianID
        `;
        
        // Tabloları tek tek ekleyelim
        try {
            // TibbiKayitlar kontrolü
            const tibbiCheck = await db.request()
                .query(`SELECT TOP 1 RecordID, AppointmentID, Diagnosis FROM TibbiKayitlar`);
            
            console.log('✅ TibbiKayitlar tablosu erişilebilir');
            
            sqlQuery += `,
                tk.RecordID,
                tk.Diagnosis
            FROM LaboratuvarTestleri t
            LEFT JOIN TibbiKayitlar tk ON t.RecordID = tk.RecordID
            `;
            
        } catch (tibbiError) {
            console.error('❌ TibbiKayitlar hatası:', tibbiError.message);
            // Sadece LaboratuvarTestleri'nden devam et
            sqlQuery += `
            FROM LaboratuvarTestleri t
            WHERE t.LabTechnicianID = @TechnicianID
            `;
        }
        
        // Request oluştur
        const request = db.request()
            .input('TechnicianID', sql.Int, technicianId);
        
        // Eğer JOIN başarılı olduysa WHERE ekle
        if (sqlQuery.includes('LEFT JOIN TibbiKayitlar')) {
            sqlQuery += ` WHERE t.LabTechnicianID = @TechnicianID`;
        }
        
        // Filtreler
        if (filterDate) {
            sqlQuery += ` AND CAST(t.RequestDate AS DATE) = @FilterDate`;
            request.input('FilterDate', sql.Date, filterDate);
        }
        
        if (filterStatus) {
            sqlQuery += ` AND t.Status = @FilterStatus`;
            request.input('FilterStatus', sql.NVarChar(20), filterStatus);
        }
        
        sqlQuery += ` ORDER BY t.RequestDate DESC`;
        
        console.log(`🔍 Çalıştırılacak SQL: ${sqlQuery}`);
        
        const result = await request.query(sqlQuery);
        
        console.log(`✅ ${result.recordset.length} test bulundu`);
        
        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('❌ LABORANT TESTLERİ HATASI - Detay:', {
            message: error.message,
            number: error.number,
            originalError: error.originalError?.message,
            stack: error.stack?.split('\n')[0]
        });
        
        res.status(500).send({ 
            success: false,
            message: 'Laborant testleri alınırken hata oluştu.',
            error: error.message,
            suggestion: 'Tabloları ve JOIN koşullarını kontrol edin.'
        });
    }
});
  // 30. Laboratuvar Test İsteği Oluşturma - RANDEVUYA BAĞLI
app.post('/api/lab/requests', async (req, res) => {
    console.log('🚨 LAB İSTEĞİ ALINDI');
    
    try {
        const { appointmentId, testName, testType, additionalNotes } = req.body;
        const db = req.app.locals.db;

        if (!appointmentId || !testName) {
            return res.status(400).send({ 
                success: false, 
                message: 'Eksik bilgi: AppointmentID ve TestName zorunludur.' 
            });
        }

        const defaultLabTechnicianID = 4; // Laborant

        // RANDEVUNUN TIBBİ KAYIDINI AL
        console.log('📋 Randevu bilgisi alınıyor...');
        
        const appointmentResult = await db.request()
            .input('AppointmentID', sql.Int, appointmentId)
            .query(`
                SELECT tk.RecordID 
                FROM TibbiKayitlar tk
                INNER JOIN Randevular r ON tk.AppointmentID = r.AppointmentID
                WHERE r.AppointmentID = @AppointmentID;
            `);
        
        let recordID = appointmentResult.recordset[0]?.RecordID;
        console.log('RecordID:', recordID);

        // Eğer RecordID yoksa oluştur
        if (!recordID) {
            console.log('📝 Yeni tıbbi kayıt oluşturuluyor...');
            
            const newRecord = await db.request()
                .input('AppointmentID', sql.Int, appointmentId)
                .input('Diagnosis', sql.NVarChar(sql.MAX), `Laboratuvar isteği: ${testName}`)
                .query(`
                    INSERT INTO TibbiKayitlar (AppointmentID, Diagnosis, RecordDate)
                    VALUES (@AppointmentID, @Diagnosis, GETDATE());
                    
                    SELECT SCOPE_IDENTITY() AS RecordID;
                `);
            
            recordID = newRecord.recordset[0]?.RecordID;
            console.log('✅ RecordID oluşturuldu:', recordID);
        }

        // LAB TESTİ OLUŞTUR
        console.log('🧪 Lab testi oluşturuluyor...');
        
        const labResult = await db.request()
            .input('RecordID', sql.Int, recordID)
            .input('AppointmentID', sql.Int, appointmentId)
            .input('TestName', sql.NVarChar(100), testName)
            .input('Status', sql.NVarChar(20), 'Bekliyor')
            .input('Results', sql.NVarChar(sql.MAX), `Test Türü: ${testType || 'Genel'}\nEk Notlar: ${additionalNotes || 'Yok'}`)
            .input('LabTechnicianID', sql.Int, defaultLabTechnicianID)
            .query(`
                INSERT INTO LaboratuvarTestleri (
                    RecordID, AppointmentID, TestName, RequestDate, 
                    Status, Results, LabTechnicianID
                )
                VALUES (
                    @RecordID, @AppointmentID, @TestName, GETDATE(),
                    @Status, @Results, @LabTechnicianID
                );
                
                SELECT SCOPE_IDENTITY() AS TestID;
            `);
        
        const testID = labResult.recordset[0]?.TestID;
        console.log('🎉 Test oluşturuldu - TestID:', testID);

        res.status(201).send({ 
            success: true,
            message: 'Laboratuvar test isteği başarıyla oluşturuldu',
            testId: testID,
            appointmentId: appointmentId,
            recordId: recordID,
            labTechnicianId: defaultLabTechnicianID,
            status: 'Bekliyor'
        });

    } catch (error) {
        console.error('❌ LAB İSTEĞİ HATASI:', error.message);
        res.status(500).send({ 
            success: false, 
            message: 'Laboratuvar isteği oluşturulamadı: ' + error.message 
        });
    }
});
// ==========================================================
// 31. Tüm Hastaları Getir (Sayfalı, Admin için) - DÜZELTİLDİ
// ==========================================================
app.get('/api/admin/patients', async (req, res) => {
    console.log('📋 Admin hasta listesi çağrıldı');
    
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const db = req.app.locals.db;

        // 1. HASTALAR tablosundan verileri al
        let hastaQuery = `
            SELECT 
                PatientID,
                TCNo,
                DateOfBirth,
                Address
            FROM Hastalar 
            WHERE 1=1
        `;

        // 2. KULLANICILAR tablosundan HASTA rolündekileri al
        let userQuery = `
            SELECT 
                UserID,
                FirstName,
                LastName,
                Email,
                PhoneNumber,
                Gender
            FROM Kullanicilar 
            WHERE RoleID = 3  -- Hasta rolü ID: 3
        `;

        const [hastalarResult, kullanicilarResult] = await Promise.all([
            db.request().query(hastaQuery),
            db.request().query(userQuery)
        ]);

        const hastalar = hastalarResult.recordset;
        const kullanicilar = kullanicilarResult.recordset;
        
        console.log(`📊 ${hastalar.length} hasta, ${kullanicilar.length} kullanıcı bulundu`);

        const patients = [];
        
        // Manuel birleştirme
        if (hastalar.length === kullanicilar.length) {
            for (let i = 0; i < hastalar.length; i++) {
                patients.push({
                    PatientID: hastalar[i].PatientID,
                    FirstName: kullanicilar[i]?.FirstName || '',
                    LastName: kullanicilar[i]?.LastName || '',
                    TCNo: hastalar[i].TCNo,
                    Gender: kullanicilar[i]?.Gender || '',
                    PhoneNumber: kullanicilar[i]?.PhoneNumber || '',
                    Email: kullanicilar[i]?.Email || '',
                    DateOfBirth: hastalar[i].DateOfBirth,
                    Address: hastalar[i].Address
                });
            }
        } else {
            for (let i = 0; i < hastalar.length; i++) {
                patients.push({
                    PatientID: hastalar[i].PatientID,
                    FirstName: '',
                    LastName: '',
                    TCNo: hastalar[i].TCNo,
                    Gender: '',
                    PhoneNumber: '',
                    Email: '',
                    DateOfBirth: hastalar[i].DateOfBirth,
                    Address: hastalar[i].Address
                });
            }
        }

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedPatients = patients.slice(startIndex, endIndex);

        res.status(200).send({
            success: true,
            patients: paginatedPatients,
            total: patients.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(patients.length / limit)
        });

    } catch (error) {
        console.error('❌ Hastalar listelenirken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Hasta verileri alınırken hata oluştu.',
            error: error.message
        });
    }
});

// 32. Departman Ekleme (Admin için) - DÜZELTİLMİŞ
app.post('/api/admin/departments', async (req, res) => {
    console.log('🏥 Departman ekleme çağrıldı');
    
    try {
        const { DepartmentName } = req.body; // ⬅️ Description'ı kaldırın
        const db = req.app.locals.db;

        if (!DepartmentName || DepartmentName.trim() === '') {
            return res.status(400).send({ 
                success: false, 
                message: 'Departman adı zorunludur.' 
            });
        }

        // Mevcut departman kontrolü
        const checkResult = await db.request()
            .input('DepartmentName', sql.NVarChar(100), DepartmentName.trim())
            .query(`
                SELECT DepartmentID 
                FROM Departmanlar 
                WHERE LOWER(DepartmentName) = LOWER(@DepartmentName)
            `);

        if (checkResult.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu isimde bir departman zaten mevcut.' 
            });
        }

        // Departman ekle
        const result = await db.request()
            .input('DepartmentName', sql.NVarChar(100), DepartmentName.trim())
            .query(`
                INSERT INTO Departmanlar (DepartmentName)
                VALUES (@DepartmentName);
                SELECT SCOPE_IDENTITY() AS DepartmentID;
            `);

        const departmentId = result.recordset[0]?.DepartmentID;
        
        console.log(`✅ Departman eklendi - ID: ${departmentId}`);

        // ⭐ DÜZELTME: SABİT Admin ID = 19 kullan
        const ADMIN_USER_ID = 19;
        
        await db.request()
            .input('UserID', sql.Int, ADMIN_USER_ID)  // ⬅️ 19
            .input('ActionType', sql.NVarChar(50), 'Departman Ekleme')
            .input('Details', sql.NVarChar(255), `"${DepartmentName}" departmanı eklendi`)
            .query(`
                INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                VALUES (@UserID, @ActionType, @Details, GETDATE())
            `);

        res.status(201).send({ 
            success: true,
            message: 'Departman başarıyla eklendi.',
            departmentId: departmentId,
            departmentName: DepartmentName
        });

    } catch (error) {
        console.error('❌ Departman ekleme hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Departman eklenirken hata oluştu.',
            error: error.message 
        });
    }
});
// ==========================================================
// 33. Doktor Ekleme - FINAL VERSION (DoctorID manuel)
// ==========================================================
app.post('/api/admin/doctors', async (req, res) => {
    console.log('👨‍⚕️ Doktor ekleme çağrıldı');
    console.log('📦 Gelen veri:', req.body);
    
    try {
        const { 
            FirstName, LastName, Email, PhoneNumber, 
            Gender, DepartmentID, Title, Username, PasswordHash, Role
        } = req.body;
        const db = req.app.locals.db;

        console.log('🎭 Gelen Role:', Role);
        console.log('🏥 Gelen DepartmentID:', DepartmentID);
        console.log('🎯 Gelen Title:', Title);
        console.log('👤 Gelen Gender:', Gender);
        
        // DepartmentID'yi number'a çevir
        let deptId = null;
        if (DepartmentID && DepartmentID !== '' && DepartmentID !== 'null' && DepartmentID !== 0) {
            deptId = parseInt(DepartmentID);
            if (isNaN(deptId)) deptId = null;
        }
        
        console.log('🔢 Kullanılacak DepartmentID:', deptId);
        
        // ⭐ EĞER DepartmentID NULL/0 ise, ilk departmanı kullan
        let finalDeptId = deptId;
        if (!finalDeptId || finalDeptId === null || finalDeptId === 0) {
            const defaultDeptResult = await db.request()
                .query('SELECT TOP 1 DepartmentID FROM Departmanlar ORDER BY DepartmentID');
            finalDeptId = defaultDeptResult.recordset[0]?.DepartmentID || 1;
            console.log('📍 Default DepartmentID kullanılıyor:', finalDeptId);
        }
        
        // 1. Kullanıcı adı kontrolü
        const usernameCheck = await db.request()
            .input('Username', sql.NVarChar(50), Username)
            .query('SELECT UserID FROM Kullanicilar WHERE Username = @Username');
        
        if (usernameCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor.' 
            });
        }

        // 2. Email kontrolü
        const emailCheck = await db.request()
            .input('Email', sql.NVarChar(100), Email)
            .query('SELECT UserID FROM Kullanicilar WHERE Email = @Email');
        
        if (emailCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu email adresi zaten kullanılıyor.' 
            });
        }

        // Rol ID'si: Doktor = 2
        const roleId = 2;
        
        // 3. Kullanıcı ekle
        const userResult = await db.request()
            .input('FirstName', sql.NVarChar(50), FirstName.trim())
            .input('LastName', sql.NVarChar(50), LastName.trim())
            .input('Username', sql.NVarChar(50), Username.trim())
            .input('PasswordHash', sql.NVarChar(255), PasswordHash)
            .input('Email', sql.NVarChar(100), Email.trim())
            .input('Gender', sql.NVarChar(10), Gender || 'Erkek')
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber || '')
            .input('RoleID', sql.Int, roleId)
            .query(`
                INSERT INTO Kullanicilar (
                    FirstName, LastName, Username, PasswordHash, 
                    Email, Gender, PhoneNumber, RoleID, CreationDate
                )
                VALUES (
                    @FirstName, @LastName, @Username, @PasswordHash,
                    @Email, @Gender, @PhoneNumber, @RoleID, GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS UserID;
            `);

        const userId = userResult.recordset[0]?.UserID;
        
        if (!userId) {
            return res.status(500).send({
                success: false,
                message: 'Kullanıcı oluşturulamadı'
            });
        }

        console.log(`✅ User oluşturuldu - UserID: ${userId}`);

        // ✅ 4. NEXT DoctorID'yi hesapla (manuel)
        const maxIdResult = await db.request()
            .query('SELECT ISNULL(MAX(DoctorID), 0) + 1 as NextDoctorID FROM Doktorlar');
        
        const nextDoctorId = maxIdResult.recordset[0]?.NextDoctorID || 1;
        
        console.log(`📊 Sonraki DoctorID: ${nextDoctorId}`);

        // ✅ 5. Doktorlar tablosuna ekle
        const doctorResult = await db.request()
            .input('DoctorID', sql.Int, nextDoctorId)
            .input('UserID', sql.Int, userId)
            .input('DepartmentID', sql.Int, finalDeptId)  // ⬅️ finalDeptId kullan
            .input('Title', sql.NVarChar(50), Title || 'Uzman Doktor')
            .query(`
                INSERT INTO Doktorlar (
                    DoctorID,
                    UserID,
                    DepartmentID,
                    Title
                )
                VALUES (
                    @DoctorID,
                    @UserID,
                    @DepartmentID,
                    @Title
                );
            `);

        console.log(`✅ DOKTOR EKLENDİ:`);
        console.log(`   🏥 DoctorID: ${nextDoctorId}`);
        console.log(`   👤 UserID: ${userId}`);
        console.log(`   📍 DepartmentID: ${finalDeptId}`);
        console.log(`   📝 Title: ${Title || 'Uzman Doktor'}`);

        // 6. Sistem log'u ekle
        try {
            await db.request()
                .input('UserID', sql.Int, 19)
                .input('ActionType', sql.NVarChar(50), 'Personel Ekleme')
                .input('Details', sql.NVarChar(255), `"${FirstName} ${LastName}" doktor olarak eklendi`)
                .query(`
                    INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                    VALUES (@UserID, @ActionType, @Details, GETDATE())
                `);
        } catch (logErr) {
            console.warn('⚠️ Log yazma hatası:', logErr.message);
        }

        res.status(201).send({ 
            success: true,
            message: 'Doktor başarıyla eklendi.',
            userId: userId,
            doctorId: nextDoctorId,
            fullName: `${FirstName} ${LastName}`
        });

    } catch (error) {
        console.error('❌ Doktor ekleme hatası:', error.message);
        res.status(500).send({ 
            success: false, 
            message: 'Doktor eklenirken hata oluştu: ' + error.message,
            error: error.message 
        });
    }
});
// ==========================================================
// 34. Sekreter Ekleme (Admin için) - DÜZELTİLDİ
// ==========================================================
app.post('/api/admin/secretaries', async (req, res) => {
    console.log('👩‍💼 Sekreter ekleme çağrıldı');
    
    try {
        const { FirstName, LastName, Email, PhoneNumber, Gender, Username, PasswordHash } = req.body;
        const db = req.app.locals.db;

        if (!FirstName || !LastName || !Email || !Username || !PasswordHash) {
            return res.status(400).send({ 
                success: false, 
                message: 'Ad, soyad, email, kullanıcı adı ve şifre zorunludur.' 
            });
        }

        // 1. Kullanıcı adı kontrolü
        const usernameCheck = await db.request()
            .input('Username', sql.NVarChar(50), Username)
            .query('SELECT UserID FROM Kullanicilar WHERE Username = @Username');
        
        if (usernameCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor.' 
            });
        }

        // 2. Email kontrolü
        const emailCheck = await db.request()
            .input('Email', sql.NVarChar(100), Email)
            .query('SELECT UserID FROM Kullanicilar WHERE Email = @Email');
        
        if (emailCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu email adresi zaten kullanılıyor.' 
            });
        }

        // ⭐ DÜZELTME: Rol ID'si 4 (Sekreter)
        const roleId = 4;

        // 3. Kullanıcı ekle (Sekreter)
        const userResult = await db.request()
            .input('FirstName', sql.NVarChar(50), FirstName.trim())
            .input('LastName', sql.NVarChar(50), LastName.trim())
            .input('Username', sql.NVarChar(50), Username.trim())
            .input('PasswordHash', sql.NVarChar(255), PasswordHash)
            .input('Email', sql.NVarChar(100), Email.trim())
            .input('Gender', sql.NVarChar(10), Gender || 'Kadın')
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber || '')
            .input('RoleID', sql.Int, roleId)
            .query(`
                INSERT INTO Kullanicilar (
                    FirstName, LastName, Username, PasswordHash, 
                    Email, Gender, PhoneNumber, RoleID, CreationDate
                )
                VALUES (
                    @FirstName, @LastName, @Username, @PasswordHash,
                    @Email, @Gender, @PhoneNumber, @RoleID, GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS UserID;
            `);

        const userId = userResult.recordset[0]?.UserID;
        
        console.log(`✅ Sekreter eklendi - UserID: ${userId}`);

        // 4. Sistem log'u ekle
        await db.request()
            .input('UserID', sql.Int, req.headers['user-id'] || 1)
            .input('ActionType', sql.NVarChar(50), 'Sekreter Ekleme')
            .input('Details', sql.NVarChar(255), `"${FirstName} ${LastName}" sekreter olarak eklendi`)
            .query(`
                INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                VALUES (@UserID, @ActionType, @Details, GETDATE())
            `);

        res.status(201).send({ 
            success: true,
            message: 'Sekreter başarıyla eklendi.',
            userId: userId,
            fullName: `${FirstName} ${LastName}`
        });

    } catch (error) {
        console.error('❌ Sekreter ekleme hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Sekreter eklenirken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 35. Laborant Ekleme (Admin için) - DÜZELTİLDİ
// ==========================================================
app.post('/api/admin/technicians', async (req, res) => {
    console.log('🔬 Laborant ekleme çağrıldı');
    
    try {
        const { FirstName, LastName, Email, PhoneNumber, Gender, Username, PasswordHash } = req.body;
        const db = req.app.locals.db;

        if (!FirstName || !LastName || !Email || !Username || !PasswordHash) {
            return res.status(400).send({ 
                success: false, 
                message: 'Ad, soyad, email, kullanıcı adı ve şifre zorunludur.' 
            });
        }

        // 1. Kullanıcı adı kontrolü
        const usernameCheck = await db.request()
            .input('Username', sql.NVarChar(50), Username)
            .query('SELECT UserID FROM Kullanicilar WHERE Username = @Username');
        
        if (usernameCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu kullanıcı adı zaten kullanılıyor.' 
            });
        }

        // 2. Email kontrolü
        const emailCheck = await db.request()
            .input('Email', sql.NVarChar(100), Email)
            .query('SELECT UserID FROM Kullanicilar WHERE Email = @Email');
        
        if (emailCheck.recordset.length > 0) {
            return res.status(409).send({ 
                success: false, 
                message: 'Bu email adresi zaten kullanılıyor.' 
            });
        }

        // ⭐ DÜZELTME: Rol ID'si 5 (Laborant)
        const roleId = 5;

        // 3. Kullanıcı ekle (Laborant)
        const userResult = await db.request()
            .input('FirstName', sql.NVarChar(50), FirstName.trim())
            .input('LastName', sql.NVarChar(50), LastName.trim())
            .input('Username', sql.NVarChar(50), Username.trim())
            .input('PasswordHash', sql.NVarChar(255), PasswordHash)
            .input('Email', sql.NVarChar(100), Email.trim())
            .input('Gender', sql.NVarChar(10), Gender || 'Erkek')
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber || '')
            .input('RoleID', sql.Int, roleId)
            .query(`
                INSERT INTO Kullanicilar (
                    FirstName, LastName, Username, PasswordHash, 
                    Email, Gender, PhoneNumber, RoleID, CreationDate
                )
                VALUES (
                    @FirstName, @LastName, @Username, @PasswordHash,
                    @Email, @Gender, @PhoneNumber, @RoleID, GETDATE()
                );
                SELECT SCOPE_IDENTITY() AS UserID;
            `);

        const userId = userResult.recordset[0]?.UserID;
        
        console.log(`✅ Laborant eklendi - UserID: ${userId}`);

        // 4. Sistem log'u ekle
        await db.request()
            .input('UserID', sql.Int, req.headers['user-id'] || 1)
            .input('ActionType', sql.NVarChar(50), 'Laborant Ekleme')
            .input('Details', sql.NVarChar(255), `"${FirstName} ${LastName}" laborant olarak eklendi`)
            .query(`
                INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                VALUES (@UserID, @ActionType, @Details, GETDATE())
            `);

        res.status(201).send({ 
            success: true,
            message: 'Laborant başarıyla eklendi.',
            userId: userId,
            fullName: `${FirstName} ${LastName}`
        });

    } catch (error) {
        console.error('❌ Laborant ekleme hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Laborant eklenirken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 36. Personel Silme (Admin için) - DÜZELTİLDİ
// ==========================================================
app.delete('/api/admin/staff/:id', async (req, res) => {
    console.log('🗑️ Personel silme çağrıldı');
    
    try {
        const { id } = req.params;
        const { role } = req.query; // 'doktor', 'sekreter', 'laborant'
        const db = req.app.locals.db;

        if (!id || !role) {
            return res.status(400).send({ 
                success: false, 
                message: 'Personel ID ve rol bilgisi zorunludur.' 
            });
        }

        // 1. Önce kullanıcı bilgilerini al (log için)
        const userInfo = await db.request()
            .input('UserID', sql.Int, id)
            .query(`
                SELECT FirstName, LastName 
                FROM Kullanicilar 
                WHERE UserID = @UserID
            `);

        if (userInfo.recordset.length === 0) {
            return res.status(404).send({ 
                success: false, 
                message: 'Kullanıcı bulunamadı.' 
            });
        }

        const { FirstName, LastName } = userInfo.recordset[0];

        // 2. Eğer doktor ise Doktorlar tablosundan da sil
        if (role.toLowerCase() === 'doktor') {
            await db.request()
                .input('UserID', sql.Int, id)  // ⬅️ Email yerine UserID
                .query('DELETE FROM Doktorlar WHERE UserID = @UserID');  
        }

        // 3. Kullanıcıyı sil
        await db.request()
            .input('UserID', sql.Int, id)
            .query('DELETE FROM Kullanicilar WHERE UserID = @UserID');
        
        console.log(`✅ ${role} silindi - ID: ${id}, Ad: ${FirstName} ${LastName}`);

        // 4. Sistem log'u ekle
        await db.request()
            .input('UserID', sql.Int, 19)  // Admin ID
            .input('ActionType', sql.NVarChar(50), 'Personel Silme')
            .input('Details', sql.NVarChar(255), `"${FirstName} ${LastName}" (${role}) sistemden silindi`)
            .query(`
                INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                VALUES (@UserID, @ActionType, @Details, GETDATE())
            `);

        res.status(200).send({ 
            success: true, 
            message: 'Personel başarıyla silindi.' 
        });

    } catch (error) {
        console.error('❌ Personel silme hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Personel silinirken hata oluştu.',
            error: error.message 
        });
    }
});
// ==========================================================
// 37. Admin İstatistikleri - DÜZELTİLDİ
// ==========================================================
app.get('/api/admin/reports', async (req, res) => {
    console.log('📊 Admin istatistikleri çağrıldı');
    
    try {
        const db = req.app.locals.db;

        const [
            patientsRes,
            doctorsRes,
            secretariesRes,
            techniciansRes,
            departmentsRes,
            todayAppointmentsRes,
            weeklyAppointmentsRes,
            monthlyAppointmentsRes,
            totalAppointmentsRes,
            activePatientsRes
        ] = await Promise.all([
            db.request().query('SELECT COUNT(*) as count FROM Hastalar'),
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 2'), // Doktor
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 4'), // Sekreter
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 5'), // Laborant
            db.request().query('SELECT COUNT(*) as count FROM Departmanlar'),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE CONVERT(DATE, AppointmentDate) = CONVERT(DATE, GETDATE())
                AND Status != 'İptal Edildi'`),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE AppointmentDate >= DATEADD(DAY, -7, GETDATE())
                AND Status != 'İptal Edildi'`),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE AppointmentDate >= DATEADD(MONTH, -1, GETDATE())
                AND Status != 'İptal Edildi'`),
            db.request().query('SELECT COUNT(*) as count FROM Randevular'),
            db.request().query(`SELECT COUNT(DISTINCT PatientID) as count FROM Randevular 
                WHERE AppointmentDate >= DATEADD(MONTH, -3, GETDATE())`)
        ]);

        const stats = {
            totalPatients: patientsRes.recordset[0].count,
            totalDoctors: doctorsRes.recordset[0].count,
            totalSecretaries: secretariesRes.recordset[0].count,
            totalTechnicians: techniciansRes.recordset[0].count,
            totalDepartments: departmentsRes.recordset[0].count,
            todayAppointments: todayAppointmentsRes.recordset[0].count,
            weeklyAppointments: weeklyAppointmentsRes.recordset[0].count,
            monthlyAppointments: monthlyAppointmentsRes.recordset[0].count,
            totalAppointments: totalAppointmentsRes.recordset[0].count,
            activePatients: activePatientsRes.recordset[0].count
        };

        console.log('✅ İstatistikler:', stats);

        res.status(200).send({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ İstatistikler alınırken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'İstatistikler alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 38. Tüm Departmanları Getir
// ==========================================================
app.get('/api/admin/departments', async (req, res) => {
    console.log('🏥 Departman listesi çağrıldı');
    
    try {
        const db = req.app.locals.db;

        const result = await db.request()
            .query(`
                SELECT 
                    d.DepartmentID,
                    d.DepartmentName,
                    '' as Description,
                    COUNT(doc.DoctorID) as DoctorCount
                FROM Departmanlar d
                LEFT JOIN Doktorlar doc ON d.DepartmentID = doc.DepartmentID
                GROUP BY d.DepartmentID, d.DepartmentName
                ORDER BY d.DepartmentName
            `);
        
        console.log(`✅ ${result.recordset.length} departman bulundu`);
        
        res.status(200).send({
            success: true,
            departments: result.recordset
        });

    } catch (error) {
        console.error('❌ Departmanlar listelenirken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Departman verileri alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 39. Personel Bilgilerini Güncelleme (Admin için) - KESİN ÇÖZÜM
// ==========================================================
app.put('/api/admin/staff/:id', async (req, res) => {
    console.log('✏️ Personel güncelleme çağrıldı');
    
    try {
        const { id } = req.params;
        const { 
            FirstName, LastName, Email, PhoneNumber, 
            Gender, DepartmentID, Title, Role 
        } = req.body;
        const db = req.app.locals.db;

        // ⭐ SABİT: Admin UserID = 19
        const ADMIN_USER_ID = 19;

        // 1. Kullanıcı bilgilerini al (log için)
        const userInfo = await db.request()
            .input('UserID', sql.Int, id)
            .query('SELECT FirstName, LastName FROM Kullanicilar WHERE UserID = @UserID');
        
        if (userInfo.recordset.length === 0) {
            return res.status(404).send({ 
                success: false, 
                message: 'Personel bulunamadı.' 
            });
        }

        const oldFirstName = userInfo.recordset[0].FirstName;
        const oldLastName = userInfo.recordset[0].LastName;

        // 2. Kullanıcıyı güncelle
        await db.request()
            .input('UserID', sql.Int, id)
            .input('FirstName', sql.NVarChar(50), FirstName || oldFirstName)
            .input('LastName', sql.NVarChar(50), LastName || oldLastName)
            .input('Email', sql.NVarChar(100), Email || '')
            .input('PhoneNumber', sql.VarChar(15), PhoneNumber || '')
            .input('Gender', sql.NVarChar(10), Gender || '')
            .query(`
                UPDATE Kullanicilar 
                SET 
                    FirstName = @FirstName,
                    LastName = @LastName,
                    Email = @Email,
                    PhoneNumber = @PhoneNumber,
                    Gender = @Gender
                WHERE UserID = @UserID
            `);

        // 3. Eğer doktor ise Doktorlar tablosunu da güncelle
        if (Role && (Role.toLowerCase() === 'doktor' || Role.toLowerCase() === 'doctor')) {
            await db.request()
                .input('UserID', sql.Int, id)  
                .input('DepartmentID', sql.Int, DepartmentID || null)
                .input('Title', sql.NVarChar(50), Title || 'Uzman Doktor')
                .query(`
                    UPDATE Doktorlar 
                    SET 
                        DepartmentID = @DepartmentID,
                        Title = @Title
                    WHERE UserID = @UserID
                `);
        }

        console.log(`✅ Personel güncellendi - ID: ${id}`);

        // ⭐ DÜZELTME: Admin ID = 19 kullan
        await db.request()
            .input('UserID', sql.Int, ADMIN_USER_ID)  // ⬅️ 19
            .input('ActionType', sql.NVarChar(50), 'Personel Güncelleme')
            .input('Details', sql.NVarChar(255), `"${FirstName || oldFirstName} ${LastName || oldLastName}" bilgileri güncellendi`)
            .query(`
                INSERT INTO SistemLoglari (UserID, ActionType, Details, LogDate)
                VALUES (@UserID, @ActionType, @Details, GETDATE())
            `);

        res.status(200).send({ 
            success: true, 
            message: 'Personel bilgileri başarıyla güncellendi.' 
        });

    } catch (error) {
        console.error('❌ Personel güncelleme hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Personel güncellenirken hata oluştu.',
            error: error.message 
        });
    }
});
// ==========================================================
// 40. Sistem Loglarını Getir (Admin için) - DÜZELTİLDİ
// ==========================================================
app.get('/api/admin/logs', async (req, res) => {
    console.log('📝 Sistem logları çağrıldı');
    
    try {
        const { page = 1, limit = 20, type = '', user = '' } = req.query;
        const offset = (page - 1) * limit;
        const db = req.app.locals.db;

        let query = `
            SELECT 
                l.LogID,
                l.UserID,
                u.FirstName,
                u.LastName,
                l.ActionType,
                l.Details,
                l.LogDate
            FROM SistemLoglari l
            LEFT JOIN Kullanicilar u ON l.UserID = u.UserID
            WHERE 1=1
        `;

        if (type && type !== 'all') {
            query += ` AND l.ActionType = @Type`;
        }

        if (user && user !== 'all') {
            query += ` AND l.UserID = @UserID`;
        }

        query += ` ORDER BY l.LogDate DESC
                   OFFSET @Offset ROWS
                   FETCH NEXT @Limit ROWS ONLY`;

        const request = db.request()
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, parseInt(limit));

        if (type && type !== 'all') {
            request.input('Type', sql.NVarChar(50), type);
        }

        if (user && user !== 'all') {
            request.input('UserID', sql.Int, parseInt(user));
        }

        const result = await request.query(query);

        // Toplam sayı
        let countQuery = `SELECT COUNT(*) as total FROM SistemLoglari l WHERE 1=1`;
        const countRequest = db.request();

        if (type && type !== 'all') {
            countQuery += ` AND l.ActionType = @Type`;
            countRequest.input('Type', sql.NVarChar(50), type);
        }

        if (user && user !== 'all') {
            countQuery += ` AND l.UserID = @UserID`;
            countRequest.input('UserID', sql.Int, parseInt(user));
        }

        const totalResult = await countRequest.query(countQuery);
        const total = totalResult.recordset[0].total;

        console.log(`✅ ${total} log bulundu, ${result.recordset.length} gösteriliyor`);

        res.status(200).send({
            success: true,
            logs: result.recordset,
            total: total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('❌ Sistem logları alınırken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Sistem logları alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 41. Tüm Departmanları Getir (Genel kullanım için)
// ==========================================================
app.get('/api/admin/departments', async (req, res) => {
    console.log('🏥 Genel departman listesi çağrıldı');
    
    try {
        const db = req.app.locals.db;

        const result = await db.request()
            .query(`
                SELECT 
                    DepartmentID,
                    DepartmentName
                FROM Departmanlar
                ORDER BY DepartmentName
            `);

        console.log(`✅ ${result.recordset.length} departman bulundu`);

        res.status(200).send(result.recordset);

    } catch (error) {
        console.error('❌ Departmanlar listelenirken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Departman verileri alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 42. Tüm Hastaları Getir (Genel kullanım için)
// ==========================================================
app.get('/api/patients', async (req, res) => {
    console.log('👥 Genel hasta listesi çağrıldı');
    
    try {
        const db = req.app.locals.db;

        const hastalarResult = await db.request()
            .query('SELECT PatientID, TCNo, DateOfBirth, Address FROM Hastalar');
        
        const kullanicilarResult = await db.request()
            .query(`
                SELECT UserID, FirstName, LastName, Email, PhoneNumber, Gender 
                FROM Kullanicilar 
                WHERE RoleID = 3  -- Hasta rolü ID: 3
            `);

        const hastalar = hastalarResult.recordset;
        const kullanicilar = kullanicilarResult.recordset;
        
        const patients = [];
        if (hastalar.length === kullanicilar.length) {
            for (let i = 0; i < hastalar.length; i++) {
                patients.push({
                    PatientID: hastalar[i].PatientID,
                    FirstName: kullanicilar[i]?.FirstName || '',
                    LastName: kullanicilar[i]?.LastName || '',
                    TCNo: hastalar[i].TCNo,
                    Gender: kullanicilar[i]?.Gender || '',
                    PhoneNumber: kullanicilar[i]?.PhoneNumber || '',
                    Email: kullanicilar[i]?.Email || '',
                    DateOfBirth: hastalar[i].DateOfBirth,
                    Address: hastalar[i].Address
                });
            }
        } else {
            hastalar.forEach(hasta => {
                patients.push({
                    PatientID: hasta.PatientID,
                    FirstName: '',
                    LastName: '',
                    TCNo: hasta.TCNo,
                    Gender: '',
                    PhoneNumber: '',
                    Email: '',
                    DateOfBirth: hasta.DateOfBirth,
                    Address: hasta.Address
                });
            });
        }

        console.log(`✅ ${patients.length} hasta bulundu`);
        res.status(200).send(patients);

    } catch (error) {
        console.error('❌ Hastalar listelenirken hata:', error.message);
        res.status(500).send({ 
            message: 'Hasta verileri alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 43. Admin Raporları - DÜZELTİLDİ
// ==========================================================
app.get('/api/admin/reports', async (req, res) => {
    console.log('📊 Admin raporları çağrıldı');
    
    try {
        const db = req.app.locals.db;

        const [
            patientsRes,
            doctorsRes,
            secretariesRes,
            techniciansRes,
            departmentsRes,
            todayAppointmentsRes,
            weeklyAppointmentsRes,
            monthlyAppointmentsRes
        ] = await Promise.all([
            db.request().query('SELECT COUNT(*) as count FROM Hastalar'),
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 2'),
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 4'),
            db.request().query('SELECT COUNT(*) as count FROM Kullanicilar WHERE RoleID = 5'),
            db.request().query('SELECT COUNT(*) as count FROM Departmanlar'),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE CONVERT(DATE, AppointmentDate) = CONVERT(DATE, GETDATE())`),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE AppointmentDate >= DATEADD(DAY, -7, GETDATE())`),
            db.request().query(`SELECT COUNT(*) as count FROM Randevular 
                WHERE AppointmentDate >= DATEADD(MONTH, -1, GETDATE())`)
        ]);

        const reports = {
            totalPatients: patientsRes.recordset[0].count,
            totalDoctors: doctorsRes.recordset[0].count,
            totalSecretaries: secretariesRes.recordset[0].count,
            totalTechnicians: techniciansRes.recordset[0].count,
            totalDepartments: departmentsRes.recordset[0].count,
            todayAppointments: todayAppointmentsRes.recordset[0].count,
            weeklyAppointments: weeklyAppointmentsRes.recordset[0].count,
            monthlyAppointments: monthlyAppointmentsRes.recordset[0].count
        };

        console.log('✅ Raporlar:', reports);

        res.status(200).send(reports);

    } catch (error) {
        console.error('❌ Raporlar alınırken hata:', error);
        res.status(500).send({ 
            success: false, 
            message: 'Raporlar alınırken hata oluştu.',
            error: error.message 
        });
    }
});

// ==========================================================
// 44. Tüm Personeli Getir (Admin için) - TAMAMEN DÜZELTİLDİ
// ==========================================================
app.get('/api/admin/staff', async (req, res) => {
  console.log('👥 Admin personel listesi çağrıldı');
  
  try {
    const db = req.app.locals.db;

    // ⭐ DÜZELTİLMİŞ SORGU - DepartmentID ve Title doğru şekilde alınıyor
    const result = await db.request()
      .query(`
        SELECT 
          u.UserID,
          u.FirstName,
          u.LastName,
          u.Email,
          u.Gender,
          u.PhoneNumber,
          u.Username,
          r.RoleName,
          ISNULL(doc.DepartmentID, NULL) AS DepartmentID,
          ISNULL(d.DepartmentName, '') AS DepartmentName,
          ISNULL(doc.Title, '') AS Title,
          doc.DoctorID
        FROM Kullanicilar u
        JOIN Roller r ON u.RoleID = r.RoleID
        LEFT JOIN Doktorlar doc ON u.UserID = doc.UserID
        LEFT JOIN Departmanlar d ON doc.DepartmentID = d.DepartmentID
        WHERE u.RoleID IN (2, 4, 5)  -- Doktor, Sekreter, Laborant
        ORDER BY 
          CASE u.RoleID 
            WHEN 2 THEN 1  -- Doktor
            WHEN 4 THEN 2  -- Sekreter
            WHEN 5 THEN 3  -- Laborant
            ELSE 4
          END,
          u.FirstName, u.LastName
      `);
    
    console.log(`✅ ${result.recordset.length} personel bulundu`);
    
    // DEBUG: Departman bilgilerini kontrol et
    result.recordset.forEach(staff => {
      console.log(`${staff.FirstName} ${staff.LastName} - Role: ${staff.RoleName}, Departman: ${staff.DepartmentName || 'Yok'}, Title: ${staff.Title || 'Yok'}`);
    });

    res.status(200).send({
      success: true,
      staff: result.recordset
    });

  } catch (error) {
    console.error('❌ Personel listesi hatası:', error.message);
    res.status(500).send({ 
      success: false, 
      message: 'Personel listesi alınamadı',
      error: error.message 
    });
  }
});
// ==========================================================
// 46. UserID'den DoctorID'yi bul
// ==========================================================
app.get('/api/doctors/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const db = req.app.locals.db;

        console.log(`🔍 UserID ${userId} için DoctorID aranıyor`);
        
        const result = await db.request()
            .input('UserID', sql.Int, userId)
            .query(`
                SELECT 
                    d.DoctorID,
                    d.UserID,
                    d.DepartmentID,
                    d.Title,
                    u.FirstName,
                    u.LastName,
                    u.Email
                FROM Doktorlar d
                INNER JOIN Kullanicilar u ON d.UserID = u.UserID
                WHERE d.UserID = @UserID
            `);
        
        if (result.recordset.length === 0) {
            console.log(`❌ UserID ${userId} için doktor bulunamadı`);
            return res.status(404).send({ 
                success: false, 
                message: 'Doktor bulunamadı' 
            });
        }
        
        console.log(`✅ UserID ${userId} → DoctorID ${result.recordset[0].DoctorID}`);
        
        res.status(200).send({
            success: true,
            doctor: result.recordset[0]
        });

    } catch (error) {
        console.error('❌ DoctorID bulma hatası:', error);
        res.status(500).send({ 
            success: false, 
            message: 'DoctorID bulunurken hata oluştu.',
            error: error.message 
        });
    }
});
// ==========================================================
// 47. Doktor tarafından reçete oluştur
app.post('/api/doctors/:doctorId/prescriptions', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { patientTC, medication, dosage, frequency, duration, notes } = req.body;
        const db = req.app.locals.db;

        console.log('💊 REÇETE OLUŞTURMA:', { doctorId, patientTC, medication });

        if (!patientTC || !medication || !dosage) {
            return res.status(400).send({ message: 'Hasta TC, ilaç ve doz zorunludur.' });
        }

        // ⭐ TC'den Hasta bilgisini al
        const patientResult = await db.request()
            .input('TCNo', sql.NVarChar(11), patientTC.trim())
            .query(`
                SELECT PatientID FROM Hastalar 
                WHERE TCNo = @TCNo
            `);

        if (patientResult.recordset.length === 0) {
            return res.status(404).send({ message: 'Hasta bulunamadı.' });
        }

        const patientId = patientResult.recordset[0].PatientID;
        console.log(`✅ PatientID: ${patientId}`);

        // Randevu bilgisini al
        const appointmentResult = await db.request()
            .input('PatientID', sql.Int, patientId)
            .input('DoctorID', sql.Int, doctorId)
            .query(`
                SELECT TOP 1 AppointmentID FROM Randevular 
                WHERE PatientID = @PatientID AND DoctorID = @DoctorID
                ORDER BY AppointmentDate DESC
            `);

        if (appointmentResult.recordset.length === 0) {
            return res.status(404).send({ message: 'Hasta ve doktor arasında randevu bulunamadı.' });
        }

        const appointmentId = appointmentResult.recordset[0].AppointmentID;
        console.log(`✅ AppointmentID: ${appointmentId}`);

        // Tıbbi kayıt bilgisini al
        const recordResult = await db.request()
            .input('AppointmentID', sql.Int, appointmentId)
            .query(`
                SELECT RecordID FROM TibbiKayitlar 
                WHERE AppointmentID = @AppointmentID
            `);

        let recordId = recordResult.recordset[0]?.RecordID;

        // Tıbbi kayıt yoksa oluştur
        if (!recordId) {
            console.log('📝 Yeni tıbbi kayıt oluşturuluyor...');
            const newRecord = await db.request()
                .input('AppointmentID', sql.Int, appointmentId)
                .input('Diagnosis', sql.NVarChar(sql.MAX), `Reçete: ${medication}`)
                .query(`
                    INSERT INTO TibbiKayitlar (AppointmentID, Diagnosis, RecordDate)
                    VALUES (@AppointmentID, @Diagnosis, GETDATE());
                    SELECT SCOPE_IDENTITY() AS RecordID;
                `);

            recordId = newRecord.recordset[0]?.RecordID;
            console.log(`✅ RecordID oluşturuldu: ${recordId}`);
        } else {
            console.log(`✅ Mevcut RecordID: ${recordId}`);
        }

        // Reçete oluştur
        const details = `
İLAÇ: ${medication}
DOZ: ${dosage}
KULLANIM: ${frequency || 'Belirtilmemiş'}
SÜRE: ${duration || 'Belirtilmemiş'}
NOTLAR: ${notes || 'Yok'}
        `.trim();

        await db.request()
            .input('RecordID', sql.Int, recordId)
            .input('Details', sql.NVarChar(sql.MAX), details)
            .execute('sp_AddPrescription');

        console.log('✅ REÇETE OLUŞTURULDU!');

        res.status(201).send({ message: 'Reçete başarıyla oluşturuldu.' });

    } catch (error) {
        console.error('❌ Doktor reçete oluşturma hatası:', error.message);
        res.status(500).send({ message: 'Sunucu hatası oluştu: ' + error.message });
    }
});
// 48. GET test detayları (hasta bilgisi ile)

app.get('/api/lab/tests/:id/details', async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        const result = await db.request()
            .input('TestID', sql.Int, id)
            .query(`
                SELECT 
                    k.FirstName + ' ' + k.LastName AS PatientName,
                    h.TCNo,
                    k.PhoneNumber
                FROM LaboratuvarTestleri lt
                INNER JOIN TibbiKayitlar tk ON lt.RecordID = tk.RecordID
                INNER JOIN Randevular r ON tk.AppointmentID = r.AppointmentID
                INNER JOIN Hastalar h ON r.PatientID = h.PatientID
                INNER JOIN Kullanicilar k ON r.PatientID = k.UserID
                WHERE lt.TestID = @TestID
            `);

        if (result.recordset.length === 0) {
            return res.status(404).send({});
        }

        res.status(200).send(result.recordset[0]);
    } catch (error) {
        console.error('Test detayları hatası:', error);
        res.status(500).send({});
    }
});
// ==========================================================
// SUNUCUYU BAŞLATMA
// ==========================================================

// Veritabanına bağlan ve sunucuyu başlat
sql.connect(dbConfig).then(pool => {
    console.log('✅ SQL Server veritabanına başarıyla bağlanıldı.');
    
    app.listen(port, () => {
        console.log(`✅ Sunucu ${port} portunda çalışıyor...`);
        console.log('📍 API Endpointleri:');
        console.log('   - GET  /api/doctors/:id/appointments?date=YYYY-MM-DD');
        console.log('   - GET  /api/doctors/:id/appointments (tüm randevular)');
        console.log('   - POST /api/appointments (yeni randevu)');
        console.log('   - GET  /api/patients/:id/appointments (hasta randevuları)');
        console.log('   - ve diğer 20+ endpoint...');
    });

    app.locals.db = pool; 
    
}).catch(err => {
    console.error('❌ Veritabanı bağlantı hatası:', err);
});