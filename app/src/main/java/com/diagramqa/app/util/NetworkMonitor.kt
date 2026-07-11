package com.diagramqa.app.util

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData

/**
 * Network connectivity monitor using the modern [ConnectivityManager.NetworkCallback]
 * API. Exposes a [LiveData] of the current connectivity state and a synchronous
 * snapshot via [isCurrentlyConnected].
 *
 * Used by:
 *  - SplashActivity (decides whether to show online or offline mode)
 *  - MainActivity (toggles offline banner)
 *  - QnAActivity (queues questions when offline, auto-syncs when online)
 */
class NetworkMonitor(private val context: Context) {

    private val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    private val _isOnline = MutableLiveData(true)
    val isOnline: LiveData<Boolean> = _isOnline

    private val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            _isOnline.postValue(true)
        }

        override fun onLost(network: Network) {
            _isOnline.postValue(hasAnyNetwork())
        }

        override fun onUnavailable() {
            _isOnline.postValue(false)
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            val internet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            val validated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            _isOnline.postValue(internet && validated)
        }
    }

    fun start() {
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        try {
            cm.registerNetworkCallback(request, callback)
        } catch (_: Throwable) { /* ignore — telephony may be unavailable */ }
        _isOnline.postValue(hasAnyNetwork())
    }

    fun stop() {
        try {
            cm.unregisterNetworkCallback(callback)
        } catch (_: Throwable) { /* ignore */ }
    }

    fun isCurrentlyConnected(): Boolean = hasAnyNetwork()

    private fun hasAnyNetwork(): Boolean {
        val active = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(active) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) &&
                (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET))
    }
}
