package com.diagramqa.app.util

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * Friendly relative-time formatter (e.g. "just now", "5 m", "2 h", "Yesterday").
 */
object TimeFormat {

    fun relative(timestamp: Long, now: Long = System.currentTimeMillis()): String {
        val delta = now - timestamp
        return when {
            delta < TimeUnit.MINUTES.toMillis(1) -> "just now"
            delta < TimeUnit.HOURS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toMinutes(delta)} m"
            delta < TimeUnit.DAYS.toMillis(1) -> "${TimeUnit.MILLISECONDS.toHours(delta)} h"
            delta < TimeUnit.DAYS.toMillis(2) -> "Yesterday"
            delta < TimeUnit.DAYS.toMillis(7) -> "${TimeUnit.MILLISECONDS.toDays(delta)} d"
            isThisYear(timestamp, now) -> SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(timestamp))
            else -> SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(Date(timestamp))
        }
    }

    fun clock(timestamp: Long): String =
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))

    fun full(timestamp: Long): String =
        SimpleDateFormat("MMM d, yyyy 'at' HH:mm", Locale.getDefault()).format(Date(timestamp))

    private fun isThisYear(timestamp: Long, now: Long): Boolean {
        val a = Calendar.getInstance().apply { timeInMillis = timestamp }
        val b = Calendar.getInstance().apply { timeInMillis = now }
        return a.get(Calendar.YEAR) == b.get(Calendar.YEAR)
    }
}
