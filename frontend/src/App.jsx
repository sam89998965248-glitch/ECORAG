
import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "https://ecorag.onrender.com";

const categories = [
  {
    icon: "🌫️",
    name: "Air Pollution",
    description: "Smoke, dust and harmful emissions",
  },
  {
    icon: "💧",
    name: "Water Pollution",
    description: "Contaminated rivers and lakes",
  },
  {
    icon: "🗑️",
    name: "Waste Management",
    description: "Garbage dumping and plastic waste",
  },
  {
    icon: "🔊",
    name: "Noise Pollution",
    description: "Excessive noise in public areas",
  },
];

function App() {
  const [showForm, setShowForm] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  // Free environmental analysis state
  const [analyses, setAnalyses] = useState({});
  const [analyzingId, setAnalyzingId] = useState(null);
  const [analysisErrors, setAnalysisErrors] = useState({});

  // RAG search state
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState([]);
  const [ragMessage, setRagMessage] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "",
    location: "",
    description: "",
  });

  // Load complaints from the backend
  async function loadComplaints() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/complaints`);

      if (!response.ok) {
        throw new Error("Could not load complaints.");
      }

      const data = await response.json();
      setComplaints(data);
    } catch {
      setError(
        "Unable to connect to the backend. Check that FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  // Update complaint form fields
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Submit a complaint
  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not submit your complaint."
        );
      }

      setSuccess(
        `Complaint submitted successfully! ID: ${data.complaint_id}`
      );

      setForm({
        name: "",
        category: "",
        location: "",
        description: "",
      });

      setShowForm(false);
      await loadComplaints();
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Run free rule-based environmental analysis
  async function analyzeComplaint(complaint) {
    setAnalyzingId(complaint.id);

    setAnalysisErrors((previous) => ({
      ...previous,
      [complaint.id]: "",
    }));

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: complaint.category,
          location: complaint.location,
          description: complaint.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to analyze this complaint."
        );
      }

      setAnalyses((previous) => ({
        ...previous,
        [complaint.id]: data.analysis,
      }));
    } catch (err) {
      setAnalysisErrors((previous) => ({
        ...previous,
        [complaint.id]:
          err.message || "Please check the backend connection.",
      }));
    } finally {
      setAnalyzingId(null);
    }
  }

  // Search the local RAG knowledge base
  async function searchKnowledge(event) {
    event.preventDefault();

    if (!ragQuery.trim()) {
      setRagError("Please enter an environmental question.");
      return;
    }

    setRagLoading(true);
    setRagError("");
    setRagMessage("");
    setRagResults([]);

    try {
      const response = await fetch(`${API_URL}/rag-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ragQuery.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Environmental search failed."
        );
      }

      setRagResults(data.results || []);
      setRagMessage(data.message || "");
    } catch (err) {
      setRagError(
        err.message ||
          "Unable to search the knowledge base. Check that the backend is running."
      );
    } finally {
      setRagLoading(false);
    }
  }

  // Put a suggested question into the search box
  function useSuggestedQuery(query) {
    setRagQuery(query);
    setRagError("");
    setRagMessage("");
    setRagResults([]);
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <a className="logo" href="#home">
          <span className="logo-icon">🌱</span>
          EcoRAG
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#issues">Environmental Issues</a>
          <a href="#knowledge">Knowledge Search</a>
          <a href="#complaints">View Complaints</a>
          <a href="#about">About</a>
        </div>

        <button
          className="nav-button"
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm(true);
          }}
        >
          Report an Issue
        </button>
      </nav>

      <main>
        {/* Hero section */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              🌍 Technology for a cleaner planet
            </span>

            <h1>
              Your Voice for a <span>Greener</span> Tomorrow
            </h1>

            <p>
              Report environmental problems, understand possible
              impacts, and explore information from environmental
              knowledge sources.
            </p>

            <button
              className="primary-button"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm(true);
              }}
            >
              Report an Environmental Issue →
            </button>

            <div className="hero-note">
              <span>✓</span> Free environmental analysis
              <span>✓</span> Knowledge search
            </div>
          </div>

          <div className="hero-art">
            <div className="earth-circle">
              <span className="earth">🌎</span>
              <span className="leaf leaf-one">🌿</span>
              <span className="leaf leaf-two">🍃</span>
            </div>

            <div className="floating-card">
              <span>🌱</span>
              <div>
                <strong>Small actions matter</strong>
                <p>Every report counts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Environmental categories */}
        <section className="issues" id="issues">
          <div className="section-heading">
            <span className="eyebrow">UNDERSTAND THE PROBLEM</span>
            <h2>What would you like to report?</h2>
            <p>
              Select an environmental issue to start a complaint.
            </p>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <button
                className="category-card"
                key={category.name}
                onClick={() => {
                  setForm((previous) => ({
                    ...previous,
                    category: category.name,
                  }));

                  setError("");
                  setSuccess("");
                  setShowForm(true);
                }}
              >
                <span className="category-icon">{category.icon}</span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <span className="card-arrow">Report issue →</span>
              </button>
            ))}
          </div>
        </section>

        {/* RAG knowledge search */}
        <section className="issues" id="knowledge">
          <div className="section-heading">
            <span className="eyebrow">EXPLORE ENVIRONMENTAL INFORMATION</span>
            <h2>Environmental Knowledge Search</h2>
            <p>
              Search our local environmental knowledge base and explore
              the sources behind the retrieved information.
            </p>
          </div>

          <div className="complaint-card knowledge-search-card">
            <form onSubmit={searchKnowledge}>
              <label htmlFor="rag-query">
                What would you like to know?
              </label>

              <textarea
                id="rag-query"
                value={ragQuery}
                onChange={(event) => setRagQuery(event.target.value)}
                placeholder="Example: What causes air pollution from factories?"
                rows="3"
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={ragLoading}
              >
                {ragLoading
                  ? "Searching knowledge base..."
                  : "Search Environmental Knowledge →"}
              </button>
            </form>

            <div className="suggested-queries">
              <p>
                <strong>Try a sample question:</strong>
              </p>

              <button
                type="button"
                className="details-button"
                onClick={() =>
                  useSuggestedQuery("Smoke and air pollution from factories")
                }
              >
                🌫️ Factory smoke
              </button>

              <button
                type="button"
                className="details-button"
                onClick={() =>
                  useSuggestedQuery("Plastic waste dumping")
                }
              >
                🗑️ Plastic waste
              </button>

              <button
                type="button"
                className="details-button"
                onClick={() =>
                  useSuggestedQuery("Dirty water and sewage in a river")
                }
              >
                💧 Water pollution
              </button>

              <button
                type="button"
                className="details-button"
                onClick={() =>
                  useSuggestedQuery("Traffic and construction noise")
                }
              >
                🔊 Noise pollution
              </button>
            </div>

            {ragError && (
              <div className="dashboard-error" role="alert">
                {ragError}
              </div>
            )}

            {ragMessage && (
              <div className="dashboard-success" role="status">
                {ragMessage}
              </div>
            )}

            {ragResults.length > 0 && (
              <div className="rag-results">
                <h3>Retrieved Knowledge</h3>

                <p>
                  Found {ragResults.length} matching knowledge-base
                  {ragResults.length === 1 ? " entry" : " entries"}.
                </p>

                {ragResults.map((result, index) => (
                  <article
                    className="complaint-details rag-result-card"
                    key={`${result.source_url}-${index}`}
                  >
                    <span className="eyebrow">
                      MATCH {index + 1}
                    </span>

                    <h3>{result.topic}</h3>

                    <p>{result.content}</p>

                    <p>
                      <strong>Source:</strong> {result.source_name}
                    </p>

                    {result.source_url && (
                      <a
                        className="source-link"
                        href={result.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit source website ↗
                      </a>
                    )}
                  </article>
                ))}

                <p className="form-note">
                  These results are retrieved from the local knowledge
                  base. Visit the source links to check the original
                  information. Search results are not a live verification
                  of the linked webpages.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Complaints dashboard */}
        <section className="complaints-section" id="complaints">
          <div className="section-heading">
            <span className="eyebrow">YOUR ENVIRONMENT MATTERS</span>
            <h2>Environmental Complaints</h2>
            <p>
              View submitted complaints and run a free preliminary
              environmental analysis.
            </p>
          </div>

          <div className="dashboard-toolbar">
            <div className="dashboard-stat">
              <span>Total complaints</span>
              <strong>{complaints.length}</strong>
            </div>

            <button
              className="primary-button refresh-button"
              onClick={loadComplaints}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh Complaints"}
            </button>
          </div>

          {error && (
            <div className="dashboard-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="dashboard-success" role="status">
              {success}
            </div>
          )}

          {loading ? (
            <p className="dashboard-message">Loading complaints...</p>
          ) : complaints.length === 0 && !error ? (
            <div className="empty-complaints">
              <span>🌿</span>
              <h3>No complaints yet</h3>
              <p>
                Submit your first environmental complaint to get started.
              </p>
            </div>
          ) : (
            <div className="complaint-grid">
              {complaints.map((item) => {
                const analysis = analyses[item.id];
                const isAnalyzing = analyzingId === item.id;

                return (
                  <article className="complaint-card" key={item.id}>
                    <div className="complaint-card-top">
                      <span className="complaint-id">
                        Complaint #{item.id}
                      </span>
                      <span className="status-badge">{item.status}</span>
                    </div>

                    <h3>{item.category}</h3>

                    <p className="complaint-description">
                      {item.description}
                    </p>

                    <div className="complaint-meta">
                      <p>
                        <strong>Reported by:</strong> {item.name}
                      </p>
                      <p>
                        <strong>Location:</strong> {item.location}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>

                    <button
                      className="details-button"
                      onClick={() =>
                        setSelectedComplaint(
                          selectedComplaint?.id === item.id ? null : item
                        )
                      }
                    >
                      {selectedComplaint?.id === item.id
                        ? "Hide details ↑"
                        : "View details →"}
                    </button>

                    {selectedComplaint?.id === item.id && (
                      <div className="complaint-details">
                        <p>
                          <strong>Complaint ID:</strong> {item.id}
                        </p>
                        <p>
                          <strong>Full description:</strong>{" "}
                          {item.description}
                        </p>
                        <p>
                          <strong>Current status:</strong> {item.status}
                        </p>
                      </div>
                    )}

                    <button
                      className="primary-button"
                      onClick={() => analyzeComplaint(item)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing
                        ? "Analyzing..."
                        : analysis
                          ? "Run Analysis Again"
                          : "Analyze Complaint"}
                    </button>

                    {analysisErrors[item.id] && (
                      <div className="dashboard-error" role="alert">
                        {analysisErrors[item.id]}
                      </div>
                    )}

                    {analysis && (
                      <div className="complaint-details analysis-result">
                        <h3>🌿 Environmental Analysis</h3>

                        <p>
                          <strong>Problem Summary</strong>
                          <br />
                          {analysis.problem_summary}
                        </p>

                        <p>
                          <strong>Possible Causes</strong>
                          <br />
                          {analysis.possible_causes}
                        </p>

                        <p>
                          <strong>Environmental Impact</strong>
                          <br />
                          {analysis.environmental_impact}
                        </p>

                        <p>
                          <strong>Recommended Actions</strong>
                          <br />
                          {analysis.recommended_actions}
                        </p>

                        <p>
                          <strong>Suggested Authority</strong>
                          <br />
                          {analysis.suggested_authority}
                        </p>

                        <p>
                          <small>{analysis.notice}</small>
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* About section */}
        <section className="about" id="about">
          <span className="eyebrow">ABOUT ECORAG</span>
          <h2>From complaints to informed action</h2>

          <p>
            EcoRAG helps people report environmental issues, receive
            preliminary rule-based guidance, and search a local knowledge
            base for relevant environmental information and source links.
          </p>

          <div className="about-points">
            <span>📄 Knowledge sources</span>
            <span>🔎 Environmental analysis</span>
            <span>🌿 Environmental awareness</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <a className="logo" href="#home">
          🌱 EcoRAG
        </a>
        <p>Building a cleaner future, one report at a time.</p>
        <span>EcoRAG · Student Project</span>
      </footer>

      {/* Complaint form modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div
            className="complaint-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              ×
            </button>

            <span className="eyebrow">MAKE YOUR VOICE HEARD</span>
            <h2>Report an Issue</h2>
            <p>Describe the environmental problem you observed.</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <label htmlFor="category">Issue category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
                <option value="Other">Other</option>
              </select>

              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="Area, city or landmark"
                value={form.location}
                onChange={handleChange}
                required
              />

              <label htmlFor="description">Complaint description</label>
              <textarea
                id="description"
                name="description"
                placeholder="Explain what happened, where, and when..."
                value={form.description}
                onChange={handleChange}
                rows="5"
                required
              />

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="primary-button submit-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Complaint →"}
              </button>

              <p className="form-note">
                Your complaint will be saved in the EcoRAG database.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
