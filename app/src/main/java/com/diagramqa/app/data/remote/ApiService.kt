package com.diagramqa.app.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

/**
 * Retrofit API contract for the DiagramQA backend.
 *
 * The companion contract is intentionally simple — it can be adapted to any
 * VLM service (your own backend, OpenAI vision, Anthropic vision, etc.).
 */
interface ApiService {

    /**
     * Uploads a diagram image and returns a remote ID that should be used in
     * subsequent /ask calls.
     */
    @Multipart
    @POST("diagrams")
    suspend fun uploadDiagram(
        @Part image: MultipartBody.Part,
        @Part("name") name: RequestBody
    ): Response<UploadDiagramResponse>

    /**
     * Asks a question about an already-uploaded diagram.
     */
    @POST("diagrams/{id}/ask")
    suspend fun askQuestion(
        @Path("id") diagramId: String,
        @retrofit2.http.Body body: AskRequest
    ): Response<AskResponse>

    /**
     * Lightweight ping used by [NetworkMonitor] to verify server reachability.
     */
    @POST("diagrams/ping")
    suspend fun ping(): Response<Unit>

    @JsonClass(generateAdapter = true)
    data class AskRequest(
        val question: String,
        @Json(name = "session_id") val sessionId: String? = null
    )

    @JsonClass(generateAdapter = true)
    data class AskResponse(
        val answer: String,
        @Json(name = "diagram_id") val diagramId: String? = null,
        @Json(name = "usage_tokens") val usageTokens: Int? = null
    )

    @JsonClass(generateAdapter = true)
    data class UploadDiagramResponse(
        val id: String,
        val url: String? = null
    )
}
