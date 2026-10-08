package com.matladuko.app.data.model

enum class Gender(val displayName: String) {
    MALE("Male"),
    FEMALE("Female"),
    OTHER("Other")
}

enum class UserStatus {
    ACTIVE,
    SUSPENDED,
    BLOCKED
}

enum class CallType {
    AUDIO,
    VIDEO
}

enum class CallStatus {
    RINGING,
    CONNECTED,
    REJECTED,
    MISSED,
    CANCELLED,
    ENDED,
    FAILED
}

data class PredefinedAvatar(
    val id: String,
    val name: String,
    val gender: String,
    val svgUrl: String,
    val accentColor: String
)

data class UserProfile(
    val id: String,
    val phoneNumber: String,
    val displayName: String,
    val gender: Gender = Gender.MALE,
    val dob: String = "2000-01-01",
    val age: Int = 24,
    val preferredLanguage: String = "Telugu",
    val secondaryLanguages: List<String> = listOf("English"),
    val avatarId: String = "av_aman",
    val avatarUrl: String = "",
    val status: UserStatus = UserStatus.ACTIVE,
    val isOnline: Boolean = true,
    val isBusy: Boolean = false,
    val isFavorite: Boolean = false,
    val coinsBalance: Int = 500,
    val totalCallsMade: Int = 0,
    val totalCallsReceived: Int = 0,
    val totalCallDurationMins: Int = 0,
    val earnedCoins: Int = 0,
    val withdrawnINR: Double = 0.0,
    val audioRatePerMin: Int = 10,
    val videoRatePerMin: Int = 20,
    val bio: String = ""
)

data class CallSession(
    val id: String,
    val callerId: String,
    val callerName: String,
    val callerAvatar: String,
    val calleeId: String,
    val calleeName: String,
    val calleeAvatar: String,
    val type: CallType,
    val status: CallStatus = CallStatus.RINGING,
    val startTime: Long? = null,
    val endTime: Long? = null,
    val durationSeconds: Int = 0,
    val billedCoins: Int = 0,
    val audioRate: Int = 10,
    val videoRate: Int = 20,
    val creatorCoinsEarned: Int = 0,
    val platformCoinsEarned: Int = 0
)

data class CoinPackage(
    val id: String,
    val coins: Int,
    val priceINR: Int,
    val tag: String? = null,
    val isPopular: Boolean = false
)

data class WalletTransaction(
    val id: String,
    val userId: String,
    val type: String, // CREDIT_PURCHASE, DEBIT_CALL, CREDIT_EARNING
    val amountCoins: Int,
    val balanceAfter: Int,
    val referenceId: String,
    val description: String,
    val createdAt: String
)

data class WithdrawalRequest(
    val id: String,
    val userId: String,
    val userName: String,
    val amountINR: Double,
    val coinsDeducted: Int,
    val payoutMethod: String,
    val accountDetails: String,
    val status: String = "Pending",
    val date: String
)
