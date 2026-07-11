package com.diagramqa.app.ui.dialog

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.diagramqa.app.databinding.DialogImagePickerBinding

class ImagePickerSheet(
    private val onCamera: () -> Unit,
    private val onGallery: () -> Unit
) : BottomSheetDialogFragment() {

    private var _b: DialogImagePickerBinding? = null
    private val b get() = _b!!

    override fun getTheme(): Int = com.diagramqa.app.R.style.ThemeOverlay_DiagramQA_BottomSheetDialog

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _b = DialogImagePickerBinding.inflate(inflater, container, false)
        return b.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        b.optionCamera.setOnClickListener { dismiss(); onCamera() }
        b.optionGallery.setOnClickListener { dismiss(); onGallery() }
        b.btnCancel.setOnClickListener { dismiss() }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _b = null
    }

    companion object {
        const val TAG = "ImagePickerSheet"
        fun show(
            fm: androidx.fragment.app.FragmentManager,
            onCamera: () -> Unit,
            onGallery: () -> Unit
        ) {
            ImagePickerSheet(onCamera, onGallery).show(fm, TAG)
        }
    }
}
