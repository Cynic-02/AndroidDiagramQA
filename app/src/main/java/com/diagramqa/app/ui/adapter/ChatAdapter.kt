package com.diagramqa.app.ui.adapter

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.diagramqa.app.data.local.MessageEntity
import com.diagramqa.app.databinding.ItemMessageAiBinding
import com.diagramqa.app.databinding.ItemMessageUserBinding
import com.diagramqa.app.util.TimeFormat

/**
 * Adapter for the chat RecyclerView. Renders user bubbles on the right and
 * AI bubbles on the left.
 */
class ChatAdapter : ListAdapter<MessageEntity, RecyclerView.ViewHolder>(DIFF) {

    override fun getItemViewType(position: Int): Int =
        if (getItem(position).role == "user") TYPE_USER else TYPE_AI

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_USER) {
            UserViewHolder(ItemMessageUserBinding.inflate(inflater, parent, false))
        } else {
            AiViewHolder(ItemMessageAiBinding.inflate(inflater, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val msg = getItem(position)
        when (holder) {
            is UserViewHolder -> holder.bind(msg)
            is AiViewHolder -> holder.bind(msg)
        }
    }

    class UserViewHolder(private val b: ItemMessageUserBinding) :
        RecyclerView.ViewHolder(b.root) {
        @SuppressLint("SetTextI18n")
        fun bind(msg: MessageEntity) {
            b.textMessage.text = msg.content
            b.textTimestamp.text = TimeFormat.clock(msg.timestamp)
            b.iconStatus.visibility = when {
                msg.errorState != null -> {
                    b.iconStatus.setImageResource(com.diagramqa.app.R.drawable.ic_error)
                    b.iconStatus.setColorFilter(
                        b.root.context.getColor(com.diagramqa.app.R.color.md_error_light)
                    )
                    View.VISIBLE
                }
                msg.isPending -> {
                    b.iconStatus.setImageResource(com.diagramqa.app.R.drawable.ic_sync)
                    b.iconStatus.setColorFilter(b.root.context.getColor(com.diagramqa.app.R.color.white))
                    View.VISIBLE
                }
                msg.isSynced -> {
                    b.iconStatus.setImageResource(com.diagramqa.app.R.drawable.ic_check)
                    b.iconStatus.setColorFilter(b.root.context.getColor(com.diagramqa.app.R.color.white))
                    View.VISIBLE
                }
                else -> View.GONE
            }
        }
    }

    class AiViewHolder(private val b: ItemMessageAiBinding) :
        RecyclerView.ViewHolder(b.root) {
        fun bind(msg: MessageEntity) {
            b.textMessage.text = msg.content
            b.textTimestamp.text = TimeFormat.clock(msg.timestamp)
        }
    }

    companion object {
        private const val TYPE_USER = 1
        private const val TYPE_AI = 2

        private val DIFF = object : DiffUtil.ItemCallback<MessageEntity>() {
            override fun areItemsTheSame(o: MessageEntity, n: MessageEntity) = o.id == n.id
            override fun areContentsTheSame(o: MessageEntity, n: MessageEntity) = o == n
        }
    }
}
