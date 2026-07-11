package com.diagramqa.app.ui.adapter

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import coil.request.CachePolicy
import com.diagramqa.app.R
import com.diagramqa.app.data.local.SessionEntity
import com.diagramqa.app.databinding.ItemHomeHeaderBinding
import com.diagramqa.app.databinding.ItemSessionBinding
import com.diagramqa.app.util.TimeFormat
import java.io.File

/**
 * Adapter for the home screen. Emits a single header item at position 0
 * followed by session cards.
 */
class SessionsAdapter(
    private val onStartSession: () -> Unit,
    private val onOpenSession: (SessionEntity) -> Unit,
    private val onLongPressSession: (SessionEntity) -> Unit
) : ListAdapter<HomeItem, RecyclerView.ViewHolder>(DIFF) {

    init { submitList(listOf(HomeItem.Header)) }

    override fun getItemViewType(position: Int): Int = when (getItem(position)) {
        is HomeItem.Header -> TYPE_HEADER
        is HomeItem.SessionItem -> TYPE_SESSION
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return when (viewType) {
            TYPE_HEADER -> HeaderViewHolder(
                ItemHomeHeaderBinding.inflate(inflater, parent, false)
            )
            else -> SessionViewHolder(
                ItemSessionBinding.inflate(inflater, parent, false)
            )
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        when (val item = getItem(position)) {
            is HomeItem.Header -> (holder as HeaderViewHolder).bind(onStartSession)
            is HomeItem.SessionItem -> (holder as SessionViewHolder).bind(
                item.session,
                onOpenSession,
                onLongPressSession
            )
        }
    }

    fun submitSessions(sessions: List<SessionEntity>) {
        submitList(listOf(HomeItem.Header) + sessions.map { HomeItem.SessionItem(it) })
    }

    class HeaderViewHolder(private val b: ItemHomeHeaderBinding) :
        RecyclerView.ViewHolder(b.root) {
        fun bind(onStartSession: () -> Unit) {
            b.btnStartSession.setOnClickListener { onStartSession() }
        }
    }

    class SessionViewHolder(private val b: ItemSessionBinding) :
        RecyclerView.ViewHolder(b.root) {

        @SuppressLint("SetTextI18n")
        fun bind(
            session: SessionEntity,
            onOpen: (SessionEntity) -> Unit,
            onLongPress: (SessionEntity) -> Unit
        ) {
            b.sessionTitle.text = session.title
            val rel = TimeFormat.relative(session.updatedAt)
            b.sessionSubtitle.text = "${session.messageCount} question" +
                if (session.messageCount == 1) "" else "s" + " · $rel"

            b.thumbDiagram.load(File(session.diagramPath)) {
                crossfade(true)
                placeholder(R.drawable.bg_shimmer)
                error(R.drawable.ic_diagram)
                diskCachePolicy(CachePolicy.ENABLED)
                memoryCachePolicy(CachePolicy.ENABLED)
            }

            // Status chip
            val ctx = b.root.context
            b.chipStatus.apply {
                when {
                    !session.isSynced -> {
                        text = "Offline"
                        chipIcon = androidx.appcompat.content.res.AppCompatResources.getDrawable(ctx, R.drawable.ic_status_offline)
                        chipIconTint = ctx.getColorStateList(R.color.status_syncing)
                        setChipBackgroundColorResource(R.color.md_surface_container_high_light)
                    }
                    else -> {
                        text = "Synced"
                        chipIcon = androidx.appcompat.content.res.AppCompatResources.getDrawable(ctx, R.drawable.ic_status_online)
                        chipIconTint = ctx.getColorStateList(R.color.status_online)
                        setChipBackgroundColorResource(R.color.md_surface_container_high_light)
                    }
                }
            }

            b.root.setOnClickListener { onOpen(session) }
            b.root.setOnLongClickListener {
                onLongPress(session); true
            }
            b.btnMore.setOnClickListener { onLongPress(session) }
        }
    }

    companion object {
        private const val TYPE_HEADER = 0
        private const val TYPE_SESSION = 1

        private val DIFF = object : DiffUtil.ItemCallback<HomeItem>() {
            override fun areItemsTheSame(o: HomeItem, n: HomeItem) = when {
                o is HomeItem.Header && n is HomeItem.Header -> true
                o is HomeItem.SessionItem && n is HomeItem.SessionItem ->
                    o.session.id == n.session.id
                else -> false
            }

            override fun areContentsTheSame(o: HomeItem, n: HomeItem) = when {
                o is HomeItem.Header && n is HomeItem.Header -> true
                o is HomeItem.SessionItem && n is HomeItem.SessionItem ->
                    o.session == n.session
                else -> false
            }
        }
    }
}

sealed class HomeItem {
    data object Header : HomeItem()
    data class SessionItem(val session: SessionEntity) : HomeItem()
}
