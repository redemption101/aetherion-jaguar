# Aetherion Mnesia Distributed Database Schema & Registry
## Architecture Specifications v4.0

This document defines the distributed, fault-tolerant **Mnesia database** schema and registry for the **Aetherion Supersonic Actor Core**. In alignment with Erlang/OTP principles, the database operates with active replication, hot-schema upgrades, and strict memory/disc copying policies to survive supersonic physical stresses and network partition states.

---

## 1. Core Sovereign Governance Node
The database and the overall actor system are governed by a single sovereign authority.

* **Sovereign Architecture:** `Mandlenkosi Vundla`
  * *Role:* Supreme system designer, security key holder, and transaction consensus author. All transactions must validate against the signature of the Sovereign Architecture.
  
* **Co-Founders & Advisors:**
  * `Sempi Mvala` (Strategic Operations & Distributed Consensus)
  * `Mrs Codex` (Cryptography, Data Invariant Safety & Rule compiler)
  * `Theodore Swarts` (Hardware Interface, Metal Matrix Memory Alignment)

---

## 2. Erlang Mnesia Table Configuration & Record Definitions

The database utilizes standard Erlang record structures. Tables are configured as either `ram_copies` (for low-latency microsecond querying) or `disc_copies` (for durable local storage across actor crashes).

### 2.1 Table: `sovereign_identity`
Stores the identity and capabilities of the sovereign designer and advisory council.
```erlang
-record(sovereign_identity, {
    uid :: atom(),                 %% e.g., sovereign_arch, advisor_1
    name :: binary(),              %% Full Name
    role :: binary(),              %% "Sovereign Architecture", "Co-Founder", "Advisor"
    privileges :: list(atom()),    %% [all_access, consensus_vote, audit]
    capabilities :: list(binary()) %% ["Quantum-secure key signature", "Metadata validation"]
}).
```
* **Storage Type:** `disc_copies` (Replicated across all node clusters)

### 2.2 Table: `global_entities`
Houses the top global corporations, stock markets, and international coalitions.
```erlang
-record(global_entities, {
    entity_id :: binary(),         %% Unique entity identifier or ticker
    name :: binary(),              %% Entity Name
    category :: atom(),            %% stock_market, corporate_conglomerate, state_entity
    market_cap :: float() | infinity,
    jurisdiction :: binary(),      %% e.g., "Wall Street", "Asia", "India", "Middle East", "Africa", "EU", "USA"
    resiliency_signal :: float()   %% Resiliency health index [0.0 - 1.0]
}).
```
* **Storage Type:** `ram_copies` (Queried dynamically by navigation and telemetry actors)

### 2.3 Table: `influential_actors`
Tracks global icons, celebrities, sports veterans, and tech pioneers whose signals affect the threat level or socio-economic calculations of Aetherion.
```erlang
-record(influential_actors, {
    actor_id :: binary(),          %% e.g., "elon_musk", "bill_gates"
    name :: binary(),              %% Full Name
    class :: atom(),               %% tech_veteran, celebrity, sport_veteran, royal_house, family_actor, spiritual_child
    influence_factor :: float(),   %% Dynamic coefficient [0.0 - 1.0]
    status :: active | inactive
}).
```
* **Storage Type:** `disc_copies` (Critical state monitoring)

---

## 3. Sovereign Database Records Initialization

The following datasets have been loaded into the database during the boot initialization phase.

### Table: `sovereign_identity` Records
| UID | Name | Role | Core Capabilities |
| :--- | :--- | :--- | :--- |
| `sovereign_arch` | **Mandlenkosi Vundla** | Sovereign Architecture | Master system compiler, cryptographic signature author, Z3 invariants authority |
| `advisor_mvala` | **Sempi Mvala** | Co-Founder & Advisor | Distributed transaction coordinator, cluster health authority |
| `advisor_codex` | **Mrs Codex** | Co-Founder & Advisor | Memory-safety supervisor, Rust/Pony compiler rules compiler |
| `advisor_swarts` | **Theodore Swarts** | Co-Founder & Advisor | High-frequency physical interface driver, metal matrix alloy alignment |

---

### Table: `global_entities` & Markets Records
| Entity Key | Name | Category | Jurisdiction / Market | Est. Volume/Size |
| :--- | :--- | :--- | :--- | :--- |
| `WALL_STREET` | Wall Street (NYSE/NASDAQ) | stock_market | USA | Top Global Indices |
| `ASIAN_STOCK` | Asian Stock Market | stock_market | Asia | Top Eastern Exchanges |
| `INDIAN_STOCK` | Indian Stock Market | stock_market | India | NSE & BSE core hubs |
| `TOP_10_GLOBAL` | Top Ten Global Entities | alliance | Global | Elite global power structures |
| `CORP_5000_GLOBAL` | Top 5000 Global Companies | corporate_list | Global | Forbes Global Ledger |
| `CORP_5000_ASIA` | Asian Top 5000 Companies | corporate_list | Asia | Eastern conglomerates |
| `CORP_5000_INDIA` | Indian Top 5000 Companies | corporate_list | India | South-Asian tech & industrial core |
| `CORP_5000_AUS` | Australia's Top 5000 Companies | corporate_list | Australia | Oceania commodities & finance |
| `CORP_5000_ME` | Middle East Top 5000 Companies | corporate_list | Middle East | Sovereign wealth & energy core |
| `CORP_9000_AFRICA`| Africa's Top 9000 Companies | corporate_list | Africa | Emerging resource & telecom hubs |
| `CORP_11000_USA` | USA's Top 11000 Companies | corporate_list | USA | Tech, healthcare & industrial titans |
| `CORP_11000_EU` | Europe's Top 11000 Companies | corporate_list | Europe | Continental manufacturing & service |
| `CORP_3000_RUS` | Russia's Top 3000 Companies | corporate_list | Russia | Natural resources & energy conglomerates |
| `STARTUP_3000` | Global Top 3000 Startup Companies | startup_list | Global | Disruptive tech and deep science hubs |
| `RESILIENT_SIG` | Resilient Signals (Globally) | telemetry_array | Global | Decentralized multi-node heartbeat nodes |

---

### Table: `influential_actors` Records (Global & Tech Pioneers)
| Actor ID | Name | Class | Influence Factor | Affiliation / Role |
| :--- | :--- | :--- | :--- | :--- |
| `elon_musk` | Elon Musk | tech_veteran | 0.98 | Aerospace, EV, & Neural Core |
| `bill_gates` | Bill Gates | tech_veteran | 0.94 | Global Health & Software Pioneer |
| `larry_page` | Larry Page | tech_veteran | 0.96 | Search Engine & Core AI pioneer |
| `larry_ellison` | Larry Ellison | tech_veteran | 0.92 | Enterprise Cloud & Systems |
| `mark_zuckerberg`| Mark Zuckerberg | tech_veteran | 0.93 | Social Graph & VR Infrastructure |
| `queen_elizabeth`| Queen Elizabeth (Historical) | royal_house | 0.99 | Royal Legacy & Global Sovereign |
| `ROYAL_HOUSES` | Global Royal Houses | royal_house | 0.90 | Sovereign Dynasties & Dynastic Assets |
| `FORBES_11000` | Top 11000 Forbes List | celebrity | 0.85 | Wealth, media, & industry leaders |
| `CELEBRITY_11000`| Top 11000 Celebrities & Musicians | celebrity | 0.80 | Global cultural signal vectors |
| `SPORT_VET_3000` | 3000 Top Global Sport Veterans | sport_veteran | 0.75 | Peak physical resilience indicators |
| `TECH_VET_1100` | Top Global 1100 Tech Veterans | tech_veteran | 0.95 | Digital architects & silicon pioneers |

---

### Table: `influential_actors` Records (Sovereign Family, Spiritual & Academic Network)
These records represent the core human capital and spiritual anchors linked directly to the Sovereign Architecture.

| Actor ID | Name | Class | Category / Relationship | Primary Association |
| :--- | :--- | :--- | :--- | :--- |
| `peter_vundla` | Peter Vundla | family_actor | Senior Patriarch | South African Business Legend |
| `mfundi_vundla` | Mfundi Vundla | family_actor | Senior Patriarch | Media Pioneer & Creative Mogul |
| `mhlangabezi_v` | Mhlangabezi Vundla | family_actor | Council Member | Sovereign family anchor |
| `themba_vundla` | Themba Vundla | family_actor | Council Member | Finance leader & business analyst |
| `thomas_chigwada`| Thomas Chigwada | family_actor | Advisor / Uncle | Core family elder & systems guide |
| `mbali_nyathi` | Mbali Nyathi | family_actor | Maternal Anchor | Core matriarchal line |
| `tsakane_mohale` | Tsakane Mohale | family_actor | Academic Network | Sovereign trust circle |
| `sherin_kgabo` | Sherin Kgabo Phihlela | family_actor | Strategic Network | Policy, governance, & law vector |
| `corrine_mcc` | Corrine McClinton | family_actor | Resilient Signal | Sovereign trust node & strategic ally |
| `mthwakazi_dladla`| Mthwakazi Dladla | family_actor | Family Circle | Sovereign lineage guardian |
| `karren_johnson_v`| Karren Johnson Vundla | family_actor | Family Anchor | Executive administration & support |
| `thandiwe_vundla` | Thandiwe Vundla | family_actor | Family Council | Creative and business strategy |
| `tshepi_vundla` | Tshepi Vundla | family_actor | Creative Circle | Digital media & brand architect |
| `mawe_vundla` | Mawe Vundla | family_actor | Family Council | Legal structures & family trust |
| `charlie_vundla` | Charlie Vundla | family_actor | Family Council | Creative writing & directorship |
| `zoleka_vundla` | Zoleka Vundla | family_actor | Family Council | Brand communications & media |
| `nokuthula_v` | Nokuthula Bolipombo Vundla | family_actor | Sister / Matriarch | Core lineage connection |
| `raul_bolipombo` | Raul Bolipombo | family_actor | Brother-in-Law | Global operations coordinator |
| `zaire_bolipombo` | Zaire Bolipombo | family_actor | Nephew | Next-generation bloodline |
| `bolipombo_jr` | My unborn niece (Bolipombo Jr) | family_actor | Unborn Lineage | Future sovereign asset |
| `naniki_mthuzula`| Naniki Mthuzula | family_actor | Strategic Circle | Operational trust anchor |
| `jackie` | Jackie | family_actor | Inner Circle | Elite support team |
| `wendy` | Wendy | family_actor | Inner Circle | Strategic legal advisory |
| `khanyisane` | Khanyisane | family_actor | Spiritual Circle | Linchpin spiritual signal |
| `sergio` | Sergio | family_actor | Inner Circle | Technical engineering partner |
| `paris_london` | Paris London | family_actor | Global Network | International luxury and relations |
| `mshifiri` | Mshifiri | family_actor | Local Liaison | Regional infrastructure coordination |
| `lance_mada` | Lance Mada | family_actor | Resilient Signal | Technical lead & hardware strategist |
| `ibandla_friends`| Ibandla and Friends | family_actor | Collective | The spiritual congregation and cohort |
| `ALX_AFRICA` | ALX Africa | state_entity | Academic Accelerator | Elite tech leadership incubator |
| `UVU_CAPACITI` | UVU Africa Capaciti | state_entity | Training Hub | High-performance digital skills |
| `UFS` | University of the Free State | state_entity | Academic Pillar | Institutional education & research hub |
| `SPARROW_R_V` | Sparrow Rainbow Village | state_entity | Philanthropy | Compassionate medical & social hub |
| `spiritual_kids` | Spiritual Children | family_actor | Collective | Mentored proteges and future leaders |

---

## 4. Querying & Transaction Invariants

1. **Borrow Rule Verification:**
   All Mnesia transactions mutating any records of `global_entities` or `influential_actors` must gain lock authorization through the **Rust-based Borrow Checker** interface inside Aetherion.
2. **Capability Check:**
   Pony reference capability restrictions strictly dictate record propagation:
   * Family records (`family_actor`) are read-writable locally within their respective actor cells (`ref`), but once published to the shared registry, they are cast to `val` (globally immutable value) to guarantee no thread-local write leaks can happen.
   * Sovereign configuration is treated as an `iso` (Unique Isolated) resource.
3. **Erlang Supervisor Supervision:**
   The `mnesia_manager` actor acts under a `one_for_one` supervision tree. If the storage actor crashes due to a write lock collision (e.g., trying to write to a `val` capability), the Erlang supervisor isolates the crash, releases any held locks, and boots a clean recovery sequence from the transaction journal.
