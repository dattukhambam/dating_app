package com.matladuko.app.data.repository

import com.matladuko.app.data.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class MatladukoRepository(private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default)) {

    val predefinedAvatars = listOf(
        PredefinedAvatar("av_aman", "Aman", "male", "https://api.dicebear.com/7.x/bottts/svg?seed=Aman", "#3b82f6"),
        PredefinedAvatar("av_swapna", "Swapna", "female", "https://api.dicebear.com/7.x/lorelei/svg?seed=Swapna&backgroundColor=ffd5dc", "#ec4899"),
        PredefinedAvatar("av_rahul", "Rahul", "male", "https://api.dicebear.com/7.x/bottts/svg?seed=Rahul", "#10b981"),
        PredefinedAvatar("av_priya", "Priya", "female", "https://api.dicebear.com/7.x/lorelei/svg?seed=Priya&backgroundColor=fce7f3", "#f43f5e"),
        PredefinedAvatar("av_vikram", "Vikram", "male", "https://api.dicebear.com/7.x/bottts/svg?seed=Vikram", "#8b5cf6"),
        PredefinedAvatar("av_ananya", "Ananya", "female", "https://api.dicebear.com/7.x/lorelei/svg?seed=Ananya&backgroundColor=fed7aa", "#f97316")
    )

    val coinPackages = listOf(
        CoinPackage("pkg_100", 100, 49),
        CoinPackage("pkg_500", 500, 199, tag = "10% Extra"),
        CoinPackage("pkg_1000", 1000, 349, tag = "20% Extra", isPopular = true),
        CoinPackage("pkg_5000", 5000, 1499, tag = "30% Extra")
    )

    private val _currentUser = MutableStateFlow(
        UserProfile(
            id = "USR_${System.currentTimeMillis() % 10000}",
            phoneNumber = "+91 98765 43210",
            displayName = "Ravi Teja",
            gender = Gender.MALE,
            age = 25,
            preferredLanguage = "Telugu",
            avatarId = "av_aman",
            avatarUrl = predefinedAvatars[0].svgUrl,
            coinsBalance = 450
        )
    )
    val currentUser: StateFlow<UserProfile> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(true)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _language = MutableStateFlow("te") // "te" or "en"
    val language: StateFlow<String> = _language.asStateFlow()

    private val _onlineUsers = MutableStateFlow<List<UserProfile>>(emptyList())
    val onlineUsers: StateFlow<List<UserProfile>> = _onlineUsers.asStateFlow()

    private val _activeCall = MutableStateFlow<CallSession?>(null)
    val activeCall: StateFlow<CallSession?> = _activeCall.asStateFlow()

    private val _incomingCall = MutableStateFlow<CallSession?>(null)
    val incomingCall: StateFlow<CallSession?> = _incomingCall.asStateFlow()

    private val _lastEndedCall = MutableStateFlow<CallSession?>(null)
    val lastEndedCall: StateFlow<CallSession?> = _lastEndedCall.asStateFlow()

    private val _callHistory = MutableStateFlow<List<CallSession>>(emptyList())
    val callHistory: StateFlow<List<CallSession>> = _callHistory.asStateFlow()

    private val _favorites = MutableStateFlow<List<UserProfile>>(emptyList())
    val favorites: StateFlow<List<UserProfile>> = _favorites.asStateFlow()

    private val _ambientNoiseDb = MutableStateFlow(42)
    val ambientNoiseDb: StateFlow<Int> = _ambientNoiseDb.asStateFlow()

    private val _isHeadphonesOn = MutableStateFlow(false)
    val isHeadphonesOn: StateFlow<Boolean> = _isHeadphonesOn.asStateFlow()

    private var callTimerJob: Job? = null

    init {
        _onlineUsers.value = emptyList()
    }

    fun toggleLanguage() {
        _language.update { if (it == "te") "en" else "te" }
    }

    fun login(phone: String) {
        _currentUser.update { it.copy(phoneNumber = phone) }
        _isLoggedIn.value = true
    }

    fun updateProfile(name: String, gender: Gender, lang: String, avatarId: String) {
        val avatar = predefinedAvatars.find { it.id == avatarId } ?: predefinedAvatars[0]
        _currentUser.update {
            it.copy(
                displayName = name,
                gender = gender,
                preferredLanguage = lang,
                avatarId = avatarId,
                avatarUrl = avatar.svgUrl
            )
        }
    }

    fun toggleFavorite(targetUser: UserProfile) {
        val currentFavs = _favorites.value
        val isAlreadyFav = currentFavs.any { it.id == targetUser.id }
        if (isAlreadyFav) {
            _favorites.value = currentFavs.filter { it.id != targetUser.id }
        } else {
            _favorites.value = currentFavs + targetUser.copy(isFavorite = true)
        }
        _onlineUsers.update { list ->
            list.map {
                if (it.id == targetUser.id) it.copy(isFavorite = !isAlreadyFav) else it
            }
        }
    }

    fun startCall(callee: UserProfile, type: CallType) {
        val user = _currentUser.value
        if (user.gender == Gender.FEMALE) {
            return
        }
        val rate = if (type == CallType.AUDIO) callee.audioRatePerMin else callee.videoRatePerMin
        if (user.coinsBalance < rate) {
            return
        }

        val session = CallSession(
            id = "CALL_${UUID.randomUUID().toString().take(8)}",
            callerId = user.id,
            callerName = user.displayName,
            callerAvatar = user.avatarUrl,
            calleeId = callee.id,
            calleeName = callee.displayName,
            calleeAvatar = callee.avatarUrl,
            type = type,
            status = CallStatus.RINGING,
            audioRate = callee.audioRatePerMin,
            videoRate = callee.videoRatePerMin
        )
        _activeCall.value = session

        // Simulate callee answering after 1.5 seconds
        scope.launch {
            delay(1500)
            if (_activeCall.value?.id == session.id) {
                _activeCall.update {
                    it?.copy(
                        status = CallStatus.CONNECTED,
                        startTime = System.currentTimeMillis()
                    )
                }
                startCallTimer()
            }
        }
    }

    fun simulateIncomingCall() {
        val femaleUsers = _onlineUsers.value.filter { it.gender == Gender.FEMALE }
        val caller = femaleUsers.randomOrNull() ?: _onlineUsers.value.firstOrNull() ?: return
        val user = _currentUser.value
        val session = CallSession(
            id = "INC_${UUID.randomUUID().toString().take(8)}",
            callerId = caller.id,
            callerName = caller.displayName,
            callerAvatar = caller.avatarUrl,
            calleeId = user.id,
            calleeName = user.displayName,
            calleeAvatar = user.avatarUrl,
            type = CallType.AUDIO,
            status = CallStatus.RINGING
        )
        _incomingCall.value = session
    }

    fun acceptIncomingCall() {
        val inc = _incomingCall.value ?: return
        _incomingCall.value = null
        val connectedSession = inc.copy(
            status = CallStatus.CONNECTED,
            startTime = System.currentTimeMillis()
        )
        _activeCall.value = connectedSession
        startCallTimer()
    }

    fun rejectIncomingCall() {
        _incomingCall.value = null
    }

    private fun startCallTimer() {
        callTimerJob?.cancel()
        callTimerJob = scope.launch {
            while (_activeCall.value?.status == CallStatus.CONNECTED) {
                delay(1000)
                _activeCall.update { curr ->
                    if (curr == null) null
                    else {
                        val newDuration = curr.durationSeconds + 1
                        val rate = if (curr.type == CallType.AUDIO) curr.audioRate else curr.videoRate
                        // Bill every 60 seconds (or 1st minute immediately)
                        val billableMinutes = (newDuration + 59) / 60
                        val billed = billableMinutes * rate
                        curr.copy(durationSeconds = newDuration, billedCoins = billed)
                    }
                }
                // Random ambient noise simulation
                if ((1..5).random() == 1) {
                    _ambientNoiseDb.value = (35..75).random()
                }
            }
        }
    }

    fun switchToVideo() {
        _activeCall.update {
            it?.copy(type = CallType.VIDEO)
        }
    }

    fun endCall() {
        callTimerJob?.cancel()
        val current = _activeCall.value ?: return
        val endedSession = current.copy(
            status = CallStatus.ENDED,
            endTime = System.currentTimeMillis()
        )
        _lastEndedCall.value = endedSession
        _activeCall.value = null

        // Deduct coins from user balance
        val coinsToDeduct = endedSession.billedCoins
        _currentUser.update {
            it.copy(
                coinsBalance = maxOf(0, it.coinsBalance - coinsToDeduct),
                totalCallsMade = it.totalCallsMade + 1,
                totalCallDurationMins = it.totalCallDurationMins + (endedSession.durationSeconds / 60)
            )
        }

        // Add to call history
        _callHistory.update { listOf(endedSession) + it }
    }

    fun buyCoins(pkg: CoinPackage) {
        _currentUser.update { it.copy(coinsBalance = it.coinsBalance + pkg.coins) }
    }

    fun toggleHeadphones() {
        _isHeadphonesOn.update { !it }
    }

    fun dismissLastEnded() {
        _lastEndedCall.value = null
    }
}
