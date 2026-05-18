# Android SQLite Implementation Guide
## For Future Prototype Phase

This guide prepares for seamless migration of the desktop database to Android.

---

## 1. ROOM PERSISTENCE LIBRARY SETUP

### 1.1 Dependencies (Android build.gradle)

```gradle
dependencies {
  // Room components
  def room_version = "2.6.1"
  
  implementation "androidx.room:room-runtime:$room_version"
  implementation "androidx.room:room-ktx:$room_version"
  kapt "androidx.room:room-compiler:$room_version"
  
  // Additional
  implementation "androidx.core:core:1.12.0"
  implementation "kotlinx-serialization-runtime:1.6.0"
}
```

---

## 2. ENTITY DEFINITIONS (Kotlin)

These map 1:1 with SQLite tables created by `db-schema.sql`

### 2.1 User Entity

```kotlin
import androidx.room.*

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val userId: String,
    val createdAt: String,
    val updatedAt: String,
    @ColumnInfo(name = "device_identifier") val deviceIdentifier: String,
    @ColumnInfo(name = "device_type") val deviceType: String,
    @ColumnInfo(name = "sync_version") val syncVersion: Int = 1
)
```

### 2.2 AnalysisSession Entity

```kotlin
@Entity(
    tableName = "analysis_sessions",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["userId"],
            childColumns = ["userId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["userId", "sessionDate"], name = "idx_sessions_user_date")
    ]
)
data class AnalysisSessionEntity(
    @PrimaryKey val sessionId: String,
    val userId: String,
    val bodyArea: String,
    val sessionDate: String,
    val lightingCondition: String? = null,
    @ColumnInfo(name = "device_orientation") val deviceOrientation: String? = null,
    val notes: String? = null
)
```

### 2.3 Image Entity

```kotlin
@Entity(
    tableName = "images",
    foreignKeys = [
        ForeignKey(entity = AnalysisSessionEntity::class, parentColumns = ["sessionId"], childColumns = ["sessionId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = UserEntity::class, parentColumns = ["userId"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)
    ],
    indices = [
        Index("sessionId"),
        Index("imageHash", unique = true)
    ]
)
data class ImageEntity(
    @PrimaryKey val imageId: String,
    val sessionId: String,
    val userId: String,
    val imagePath: String,
    val imageHash: String? = null,
    @ColumnInfo(name = "image_size_kb") val imageSizeKb: Int? = null,
    val width: Int? = null,
    val height: Int? = null,
    val createdAt: String,
    @ColumnInfo(name = "stored_locally") val storedLocally: Boolean = true
)
```

### 2.4 FeatureAnalysis Entity

```kotlin
@Entity(
    tableName = "feature_analyses",
    foreignKeys = [
        ForeignKey(entity = ImageEntity::class, parentColumns = ["imageId"], childColumns = ["imageId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = AnalysisSessionEntity::class, parentColumns = ["sessionId"], childColumns = ["sessionId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = UserEntity::class, parentColumns = ["userId"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)
    ],
    indices = [
        Index(value = ["userId", "analysisTimestamp"], name = "idx_analyses_user_date"),
        Index("imageId")
    ]
)
data class FeatureAnalysisEntity(
    @PrimaryKey val analysisId: String,
    val imageId: String,
    val sessionId: String,
    val userId: String,
    
    val spotCount: Int,
    val textureScore: Double,
    val averagePigmentation: Double,
    
    val analysisTimestamp: String,
    @ColumnInfo(name = "processing_time_ms") val processingTimeMs: Int? = null,
    @ColumnInfo(name = "algorithm_version") val algorithmVersion: String = "v1.0",
    @ColumnInfo(name = "confidence_score") val confidenceScore: Double? = null
)
```

### 2.5 BaselineReference Entity

```kotlin
@Entity(
    tableName = "baseline_references",
    foreignKeys = [
        ForeignKey(entity = UserEntity::class, parentColumns = ["userId"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = FeatureAnalysisEntity::class, parentColumns = ["analysisId"], childColumns = ["analysisId"], onDelete = ForeignKey.RESTRICT)
    ],
    indices = [
        Index(value = ["userId", "bodyArea"], name = "idx_baseline_user_area")
    ]
)
data class BaselineReferenceEntity(
    @PrimaryKey val baselineId: String,
    val userId: String,
    val bodyArea: String,
    val analysisId: String,
    val sessionId: String,
    
    @ColumnInfo(name = "baseline_spot_count") val baselineSpotCount: Int,
    @ColumnInfo(name = "baseline_texture_score") val baselineTextureScore: Double,
    @ColumnInfo(name = "baseline_pigmentation") val baselinePigmentation: Double,
    
    @ColumnInfo(name = "established_date") val establishedDate: String,
    @ColumnInfo(name = "is_active") val isActive: Boolean = true
)
```

### 2.6 Recommendation Entity

```kotlin
@Entity(
    tableName = "recommendations",
    foreignKeys = [
        ForeignKey(entity = UserEntity::class, parentColumns = ["userId"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE),
        ForeignKey(entity = FeatureAnalysisEntity::class, parentColumns = ["analysisId"], childColumns = ["analysisId"], onDelete = ForeignKey.CASCADE)
    ],
    indices = [
        Index(value = ["userId", "viewedAt"], name = "idx_recommendations_user_viewed")
    ]
)
data class RecommendationEntity(
    @PrimaryKey val recommendationId: String,
    val userId: String,
    val analysisId: String,
    val sessionId: String,
    
    val status: String,  // 'Stable', 'Regression Detected', 'Alert', 'Critical'
    val advice: String,
    val severity: Double? = null,
    
    val generatedAt: String,
    val viewedAt: String? = null,
    val actedUpon: Boolean = false,
    var actionNote: String? = null
)
```

### 2.7 SyncMetadata Entity

```kotlin
@Entity(
    tableName = "sync_metadata",
    foreignKeys = [
        ForeignKey(entity = UserEntity::class, parentColumns = ["userId"], childColumns = ["userId"], onDelete = ForeignKey.CASCADE)
    ],
    indices = [
        Index(value = ["syncedToServer", "lastModified"], name = "idx_sync_pending")
    ]
)
data class SyncMetadataEntity(
    @PrimaryKey val syncRecordId: String,
    val tableName: String,
    val recordId: String,
    val userId: String? = null,
    
    val operation: String,  // 'INSERT', 'UPDATE', 'DELETE'
    val lastModified: String,
    @ColumnInfo(name = "synced_to_server") val syncedToServer: Boolean = false,
    val syncTimestamp: String? = null,
    @ColumnInfo(name = "device_origin") val deviceOrigin: String  // 'android'
)
```

---

## 3. DATA ACCESS OBJECTS (DAOs)

### 3.1 UserDao

```kotlin
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Insert
    suspend fun insertUser(user: UserEntity)
    
    @Query("SELECT * FROM users WHERE userId = :userId")
    fun getUserById(userId: String): Flow<UserEntity>
    
    @Query("SELECT * FROM users WHERE device_identifier = :deviceId")
    suspend fun getUserByDevice(deviceId: String): UserEntity?
    
    @Update
    suspend fun updateUser(user: UserEntity)
}
```

### 3.2 AnalysisSessionDao

```kotlin
@Dao
interface AnalysisSessionDao {
    @Insert
    suspend fun insertSession(session: AnalysisSessionEntity)
    
    @Query("""
        SELECT * FROM analysis_sessions
        WHERE userId = :userId AND sessionDate >= datetime('now', '-' || :days || ' days')
        ORDER BY sessionDate DESC
    """)
    fun getUserSessions(userId: String, days: Int = 30): Flow<List<AnalysisSessionEntity>>
    
    @Query("SELECT * FROM analysis_sessions WHERE sessionId = :sessionId")
    suspend fun getSessionById(sessionId: String): AnalysisSessionEntity?
}
```

### 3.3 FeatureAnalysisDao

```kotlin
@Dao
interface FeatureAnalysisDao {
    @Insert
    suspend fun insertAnalysis(analysis: FeatureAnalysisEntity)
    
    @Query("""
        SELECT * FROM feature_analyses
        WHERE userId = :userId
        ORDER BY analysisTimestamp DESC
        LIMIT :limit
    """)
    fun getUserAnalyses(userId: String, limit: Int = 100): Flow<List<FeatureAnalysisEntity>>
    
    @Query("""
        SELECT * FROM feature_analyses
        WHERE userId = :userId AND analysisTimestamp >= :startDate
        ORDER BY analysisTimestamp DESC
    """)
    fun getAnalysesByDateRange(userId: String, startDate: String): Flow<List<FeatureAnalysisEntity>>
    
    @Query("SELECT * FROM feature_analyses WHERE analysisId = :analysisId")
    suspend fun getAnalysisById(analysisId: String): FeatureAnalysisEntity?
}
```

### 3.4 BaselineReferenceDao

```kotlin
@Dao
interface BaselineReferenceDao {
    @Insert
    suspend fun insertBaseline(baseline: BaselineReferenceEntity)
    
    @Query("""
        UPDATE baseline_references
        SET is_active = 0
        WHERE userId = :userId AND bodyArea = :bodyArea AND is_active = 1
    """)
    suspend fun deactivateBaseline(userId: String, bodyArea: String)
    
    @Query("""
        SELECT * FROM baseline_references
        WHERE userId = :userId AND bodyArea = :bodyArea AND is_active = 1
    """)
    suspend fun getActiveBaseline(userId: String, bodyArea: String): BaselineReferenceEntity?
}
```

### 3.5 RecommendationDao

```kotlin
@Dao
interface RecommendationDao {
    @Insert
    suspend fun insertRecommendation(recommendation: RecommendationEntity)
    
    @Query("""
        SELECT * FROM recommendations
        WHERE userId = :userId AND viewedAt IS NULL
        ORDER BY generatedAt DESC
    """)
    fun getUnviewedRecommendations(userId: String): Flow<List<RecommendationEntity>>
    
    @Query("UPDATE recommendations SET viewedAt = CURRENT_TIMESTAMP WHERE recommendationId = :id")
    suspend fun markAsViewed(id: String)
}
```

---

## 4. DATABASE CLASS

### 4.1 Main Database

```kotlin
import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(
    entities = [
        UserEntity::class,
        AnalysisSessionEntity::class,
        ImageEntity::class,
        FeatureAnalysisEntity::class,
        BaselineReferenceEntity::class,
        RecommendationEntity::class,
        SyncMetadataEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters()
abstract class AnalysisDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun sessionDao(): AnalysisSessionDao
    abstract fun analysisDao(): FeatureAnalysisDao
    abstract fun baselineDao(): BaselineReferenceDao
    abstract fun recommendationDao(): RecommendationDao
    abstract fun syncDao(): SyncMetadataDao
    
    companion object {
        @Volatile
        private var INSTANCE: AnalysisDatabase? = null
        
        fun getInstance(context: Context): AnalysisDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AnalysisDatabase::class.java,
                    "analysis.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

---

## 5. REPOSITORY PATTERN

### 5.1 Analysis Repository

```kotlin
class AnalysisRepository(
    private val sessionDao: AnalysisSessionDao,
    private val analysisDao: FeatureAnalysisDao,
    private val baselineDao: BaselineReferenceDao,
    private val recommendationDao: RecommendationDao
) {
    
    suspend fun createSession(
        userId: String,
        bodyArea: String,
        lightingCondition: String? = null
    ): String = withContext(Dispatchers.IO) {
        val session = AnalysisSessionEntity(
            sessionId = UUID.randomUUID().toString(),
            userId = userId,
            bodyArea = bodyArea,
            sessionDate = LocalDateTime.now().toString(),
            lightingCondition = lightingCondition
        )
        sessionDao.insertSession(session)
        session.sessionId
    }
    
    suspend fun storeAnalysis(
        sessionId: String,
        userId: String,
        spotCount: Int,
        textureScore: Double,
        pigmentation: Double
    ) = withContext(Dispatchers.IO) {
        val analysis = FeatureAnalysisEntity(
            analysisId = UUID.randomUUID().toString(),
            sessionId = sessionId,
            userId = userId,
            imageId = "",  // Would be set from image processing
            spotCount = spotCount,
            textureScore = textureScore,
            averagePigmentation = pigmentation,
            analysisTimestamp = LocalDateTime.now().toString()
        )
        analysisDao.insertAnalysis(analysis)
    }
    
    fun getUserTrends(userId: String, days: Int = 30): Flow<List<FeatureAnalysisEntity>> {
        return analysisDao.getUserAnalyses(userId)
    }
}
```

---

## 6. MIGRATION FROM DESKTOP

### 6.1 Database Export (Desktop Node.js)

```typescript
// Export as JSON from desktop
const exportData = db.exportUserData(userId);
const json = JSON.stringify(exportData, null, 2);
// Save or transmit to Android
```

### 6.2 Database Import (Android Kotlin)

```kotlin
suspend fun importDesktopData(jsonData: String, context: Context) = withContext(Dispatchers.IO) {
    val db = AnalysisDatabase.getInstance(context)
    val data = Json.decodeFromString<ExportedData>(jsonData)
    
    // Insert in proper order (respect foreign keys)
    data.users.forEach { db.userDao().insertUser(it.toEntity()) }
    data.sessions.forEach { db.sessionDao().insertSession(it.toEntity()) }
    data.images.forEach { db.imageDao().insertImage(it.toEntity()) }
    data.analyses.forEach { db.analysisDao().insertAnalysis(it.toEntity()) }
    data.baselines.forEach { db.baselineDao().insertBaseline(it.toEntity()) }
    data.recommendations.forEach { db.recommendationDao().insertRecommendation(it.toEntity()) }
}
```

---

## 7. SYNC IMPLEMENTATION

### 7.1 Sync Manager (Android)

```kotlin
class SyncManager(
    private val db: AnalysisDatabase,
    private val apiService: ApiService
) {
    
    suspend fun syncPendingChanges(userId: String) = withContext(Dispatchers.IO) {
        val pendingRecords = db.syncDao().getPendingRecords()
        
        pendingRecords.forEach { record ->
            try {
                when (record.operation) {
                    "INSERT" -> apiService.uploadData(record)
                    "UPDATE" -> apiService.updateData(record)
                    "DELETE" -> apiService.deleteData(record.recordId)
                }
                db.syncDao().markSynced(record.syncRecordId)
            } catch (e: Exception) {
                Log.e("SyncManager", "Sync failed for ${record.recordId}", e)
            }
        }
    }
    
    fun observeSyncStatus(): Flow<SyncStatus> {
        return db.syncDao().observePendingCount()
            .map { count ->
                if (count == 0) SyncStatus.SYNCED else SyncStatus.PENDING
            }
            .distinctUntilChanged()
    }
}
```

---

## 8. MIGRATION CHECKLIST

### Before Migrating to Android

- [ ] Database schema validated (matches `db-schema.sql`)
- [ ] All entities created with proper indexes
- [ ] DAOs implemented for all tables
- [ ] Repository layer tested
- [ ] Sync metadata tracking enabled
- [ ] Device type markers in place ('android' vs 'desktop')
- [ ] Export/import tested on desktop
- [ ] Foreign key constraints enforced
- [ ] Room AutoMigration not needed (same schema)

### After Migration

- [ ] Restored data from desktop verified
- [ ] All analyses queryable
- [ ] Baselines correctly established
- [ ] Recommendations populated
- [ ] Sync metadata marked with device_origin = 'android'
- [ ] Performance tested with full dataset
- [ ] Background sync working
- [ ] Offline mode tested

---

## 9. PERFORMANCE NOTES

### Android-Specific Optimizations

1. **Cursor Processing**
   ```kotlin
   // Efficient cursor handling
   @Query("SELECT * FROM feature_analyses WHERE userId = ?")
   fun getAnalyses(userId: String): Flow<List<FeatureAnalysisEntity>>
   
   // Never: List<Cursor> - Room handles conversion
   ```

2. **Flow Over LiveData**
   ```kotlin
   // Preferred (coroutines-native)
   fun observeAnalyses(): Flow<List<T>>
   
   // Older approach
   fun observeAnalyses(): LiveData<List<T>>
   ```

3. **Transaction Support**
   ```kotlin
   @Transaction
   suspend fun createSessionWithAnalysis(
       session: AnalysisSessionEntity,
       analysis: FeatureAnalysisEntity
   ) {
       // Both succeed or both fail
   }
   ```

---

## 10. ANDROID-SPECIFIC PERMISSIONS

### AndroidManifest.xml

```xml
<!-- Database file access -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- For camera integration later -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- For background sync -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

---

## 11. EXAMPLE ANDROID USAGE

```kotlin
class AnalysisViewModel(
    private val repository: AnalysisRepository,
    private val syncManager: SyncManager
) : ViewModel() {
    
    private val userId = "user123"  // From authentication
    
    val userAnalyses = repository.getUserAnalyses(userId)
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    
    val recommendations = repository.getRecommendations(userId)
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    
    fun addAnalysis(spotCount: Int, texture: Double, pigmentation: Double) {
        viewModelScope.launch {
            val sessionId = repository.createSession(userId, "forehead")
            repository.storeAnalysis(sessionId, userId, spotCount, texture, pigmentation)
            syncManager.syncPendingChanges(userId)
        }
    }
}
```

---

## Summary

The SQLite schema created in the desktop environment is **100% compatible** with Android's Room library. This guide provides:

✅ Entity definitions matching the schema
✅ DAO interfaces for type-safe queries
✅ Repository pattern for clean architecture
✅ Sync implementation for cross-device support
✅ Migration scripts for desktop→Android
✅ Performance optimizations

The transition from desktop to Android prototype will be seamless.
