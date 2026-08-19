import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cardTypeLabels, formatDateTime } from "@/lib/buildmap/presentation";
import { createPublicClient } from "@/lib/supabase/public";
import styles from "./page.module.css";

type PublicDecision = {
  change_card_id: string;
  project_id: string;
  card_type: string;
  title: string;
  structured_summary: string;
  evidence: string | null;
  decision: string | null;
  change_content: string | null;
  next_check: string | null;
  importance: string;
  approved_at: string | null;
  created_at: string;
};

type PublicProjectLink = {
  project_link_id: string;
  project_id: string;
  label: string;
  url: string;
  link_type: string;
  sort_order: number;
};

const lifecycleLabels: Record<string, string> = {
  idea: "아이디어",
  building: "만드는 중",
  testing: "검증 중",
  beta: "베타",
  operating: "운영 중",
  paused: "일시 중지",
  ended: "종료",
};

function Decision({ card }: { card: PublicDecision }) {
  return (
    <article className={styles.decisionCard}>
      <div className={styles.decisionMeta}>
        <Badge>{cardTypeLabels[card.card_type] ?? card.card_type}</Badge>
        {card.importance === "major_turning_point" ? (
          <Badge tone="review">Major Turning Point</Badge>
        ) : null}
        <time>{formatDateTime(card.approved_at || card.created_at)}</time>
      </div>

      <h3>{card.title}</h3>
      <p className={styles.summary}>{card.structured_summary}</p>

      <div className={styles.whyGrid}>
        {card.evidence ? (
          <div className={styles.detail}>
            <span>Why · Evidence</span>
            <p>{card.evidence}</p>
          </div>
        ) : null}
        {card.decision ? (
          <div className={styles.detail}>
            <span>Why · Judgment</span>
            <p>{card.decision}</p>
          </div>
        ) : null}
        {card.change_content ? (
          <div className={`${styles.detail} ${styles.full}`}>
            <span>What changed</span>
            <p>{card.change_content}</p>
          </div>
        ) : null}
        {card.next_check ? (
          <div className={`${styles.detail} ${styles.full}`}>
            <span>Open question · Next check</span>
            <p>{card.next_check}</p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function PublicProjectMapPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  const supabase = createPublicClient();

  const project = await supabase
    .from("public_project_pages")
    .select(
      "project_id, public_slug, title, one_line_description, current_need_summary, lifecycle_status, created_at, last_activity_at, builder_display_name, builder_bio",
    )
    .eq("public_slug", publicSlug)
    .maybeSingle();

  if (project.error) {
    throw new Error("Failed to load public project.");
  }
  if (!project.data) {
    notFound();
  }

  const [timeline, projectLinks] = await Promise.all([
    supabase
      .from("public_decision_timeline")
      .select(
        "change_card_id, project_id, card_type, title, structured_summary, evidence, decision, change_content, next_check, importance, approved_at, created_at",
      )
      .eq("project_id", project.data.project_id)
      .order("approved_at", { ascending: true }),
    supabase
      .from("public_project_links")
      .select("project_link_id, project_id, label, url, link_type, sort_order")
      .eq("project_id", project.data.project_id)
      .eq("link_type", "github")
      .order("sort_order", { ascending: true }),
  ]);

  if (timeline.error || projectLinks.error) {
    throw new Error("Failed to load public project map.");
  }

  const rows = (timeline.data ?? []) as PublicDecision[];
  const githubLinks = (projectLinks.data ?? []) as PublicProjectLink[];
  const latestDecision = rows.length > 0 ? rows[rows.length - 1] : null;
  const currentDirection = latestDecision
    ? latestDecision.change_content || latestDecision.decision || latestDecision.structured_summary
    : null;
  const majorTurningPoints = rows.filter(
    (card) => card.importance === "major_turning_point",
  );
  const openQuestions = rows
    .filter((card) => Boolean(card.next_check))
    .slice(-4)
    .reverse();
  const recentChanges = rows.slice(-3).reverse();

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/">
            <span className="brand-mark">BM</span>
            BuildMap
          </Link>
          <span className={styles.scoutLabel}>Public Project Map · Scout view</span>
        </header>

        <section className={styles.projectHeader}>
          <div className={styles.projectMeta}>
            <Badge tone="primary">{lifecycleLabels[project.data.lifecycle_status] ?? project.data.lifecycle_status}</Badge>
            <span>Builder · {project.data.builder_display_name}</span>
            {project.data.last_activity_at ? (
              <span>최근 변화 {formatDateTime(project.data.last_activity_at)}</span>
            ) : null}
          </div>
          <h1>{project.data.title}</h1>
          {project.data.one_line_description ? (
            <p className={styles.projectLead}>{project.data.one_line_description}</p>
          ) : null}
        </section>

        <section className={styles.direction}>
          <p className="section-kicker">Current direction</p>
          {currentDirection ? (
            <>
              <h2>{currentDirection}</h2>
              <p>
                가장 최근 공개 Decision에서 파생된 현재 방향입니다. 아래 Project Map에서 이 방향에 도달한 이유를 시간순으로 읽을 수 있습니다.
              </p>
            </>
          ) : (
            <>
              <h2>아직 공개된 Current Direction이 없습니다.</h2>
              <p>Builder가 공개한 Decision이 생기면 이 프로젝트가 현재 어디로 가고 있는지 여기에 나타납니다.</p>
            </>
          )}
        </section>

        <div className={styles.layout}>
          <section className={styles.mapCard}>
            <div className={styles.sectionHead}>
              <div>
                <p className="section-kicker">Decision map</p>
                <h2>How this project got here</h2>
                <p className="section-help">공개된 공식 판단만 오래된 순서부터 이어서 봅니다.</p>
              </div>
              <Badge tone="success">{rows.length} decisions</Badge>
            </div>

            {rows.length === 0 ? (
              <div className={styles.empty}>아직 공개된 Decision이 없습니다.</div>
            ) : (
              <div className={styles.timeline}>
                {rows.map((card) => (
                  <div
                    className={`${styles.timelineItem} ${card.importance === "major_turning_point" ? styles.turning : ""}`}
                    id={`decision-${card.change_card_id}`}
                    key={card.change_card_id}
                  >
                    <Decision card={card} />
                  </div>
                ))}
                {currentDirection ? (
                  <div className={styles.timelineItem}>
                    <article className={styles.decisionCard}>
                      <div className={styles.decisionMeta}>
                        <Badge tone="success">Current</Badge>
                      </div>
                      <h3>Current Direction</h3>
                      <p className={styles.summary} style={{ marginBottom: 0 }}>
                        {currentDirection}
                      </p>
                    </article>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <aside className={styles.sideStack}>
            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <div>
                  <p className="section-kicker">Major turning points</p>
                  <h2>큰 방향 전환</h2>
                </div>
                <Badge tone="review">{majorTurningPoints.length}</Badge>
              </div>
              {majorTurningPoints.length === 0 ? (
                <div className={styles.empty}>공개된 주요 전환점이 없습니다.</div>
              ) : (
                <ul className={styles.compactList}>
                  {majorTurningPoints.map((card) => (
                    <li className={styles.compactItem} key={card.change_card_id}>
                      <a href={`#decision-${card.change_card_id}`}>
                        <strong>{card.title}</strong>
                        <small>{cardTypeLabels[card.card_type] ?? card.card_type}</small>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <div>
                  <p className="section-kicker">Open questions</p>
                  <h2>다음에 확인할 것</h2>
                </div>
              </div>
              {openQuestions.length === 0 ? (
                <div className={styles.empty}>공개된 다음 확인 항목이 없습니다.</div>
              ) : (
                <ul className={styles.compactList}>
                  {openQuestions.map((card) => (
                    <li className={styles.compactItem} key={card.change_card_id}>
                      <p>{card.next_check}</p>
                      <small>{card.title}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.sideCard}>
              <div className={styles.sectionHead}>
                <div>
                  <p className="section-kicker">Recent changes</p>
                  <h2>최근 변화</h2>
                </div>
              </div>
              {recentChanges.length === 0 ? (
                <div className={styles.empty}>공개된 최근 변화가 없습니다.</div>
              ) : (
                <ul className={styles.compactList}>
                  {recentChanges.map((card) => (
                    <li className={styles.compactItem} key={card.change_card_id}>
                      <a href={`#decision-${card.change_card_id}`}>
                        <strong>{card.title}</strong>
                        <small>{formatDateTime(card.approved_at || card.created_at)}</small>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {githubLinks.length > 0 ? (
              <section className={styles.sideCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p className="section-kicker">Build history</p>
                    <h2>GitHub repositories</h2>
                  </div>
                  <Badge tone="primary">{githubLinks.length}</Badge>
                </div>
                <ul className={styles.compactList}>
                  {githubLinks.map((link) => (
                    <li className={styles.compactItem} key={link.project_link_id}>
                      <a href={link.url} rel="noreferrer" target="_blank">
                        <strong>{link.label}</strong>
                        <small>GitHub ↗</small>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {project.data.current_need_summary ? (
              <section className={styles.sideCard}>
                <div className={styles.sectionHead}>
                  <div>
                    <p className="section-kicker">Current need</p>
                    <h2>지금 필요한 것</h2>
                  </div>
                </div>
                <p style={{ marginBottom: 0 }}>{project.data.current_need_summary}</p>
              </section>
            ) : null}
          </aside>
        </div>

        <footer className={styles.footer}>
          <span>
            이 화면은 Builder가 공개한 Project 정보, 승인 Decision, 외부 Project link만으로 구성됩니다.
          </span>
          {project.data.builder_bio ? <span>{project.data.builder_bio}</span> : null}
        </footer>
      </div>
    </main>
  );
}
