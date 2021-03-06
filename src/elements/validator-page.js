import { XPage } from './x-page.js';
import {html} from '../node_modules/lit-html/lib/lit-extended.js'
import { displayTrustIndex, navigateToValidator } from '../lib/utils.js';

class ValidatorPage extends XPage {
  get peerId() {
    return this.params.id
  }

  get validator() {
    return this.data.accounts[this.peerId]
  }

  get acceptsConnectionsDailyAverage() {
    const history = this.accepts_connections_history['1d']
    const distribution = history[history.length - 1].data
    const total = Object.entries(distribution).reduce((m, d) => m += d[1], 0)
    return distribution['true'] / total
  }

  get template() {
    return html`${ this.active ? this.validatorTemplate : "" }`
  }

  get configurationTemplate() {
    const v = this.validator
    return html`
      <h3>Node configuration</h3>
      <attribute-pairs class="validatorConfiguration">
        <dt>Ledger Version</dt><dd>${v.ledger_version}</dd>
        <dt>Overlay Version</dt><dd>${v.overlay_version}</dd>
        <dt>Minimum Overlay Version</dt><dd>${v.overlay_min_version}</dd>
        <dt>Version String</dt><dd>${v.version_string}</dd>
      </attribute-pairs>
    `
  }

  get networkInformationTemplate() {
    const v = this.validator
    return html`
      <h3>Network Information</h3>
      <attribute-pairs class="networkInformation">
        <dt>Address</dt><dd>${v.address}</dd>
        <dt>Network ID</dt><dd>${v.network_id}</dd>
        <dt>Peer ID</dt><dd>${v.peer_id}</dd>
      </attribute-pairs>
    `
  }

  get statusTemplate() {
    const v = this.validator
    return html`
      <h3>Node Status</h3>
      <attribute-pairs class="nodeStatus">
        <dt>Accepting Connections</dt><dd>${
          v.accepting_connections ?
            "Yes" :
              v.error ? "No, " + v.error : "No"
          }</dd>
      </attribute-pairs>
    `
  }

  get introductionTemplate() {
    const validator = this.validator
    const organization_sentence = html`
      This node is part of the <organization-link id=${validator.organization.id}></organization-link> organization.
    `
    const known = validator.known_info ? "" : "not "
    const known_sentence = html`This validator is <b>${known}listed</b> in the stellar.org
    list of <a href="https://www.stellar.org/developers/guides/nodes.html">known validators</a>.`
    const account_info = validator.account_info
    const account_info_sentence =
      html`It has <b>${account_info ? "" : "not "}connected</b> a ${
        account_info ? html`<a href="https://stellarchain.io/address/${this.peerId}">Stellar account</a>` : "Stellar account"
      }.`
    return html`
      <p>
        ${organization_sentence} ${known_sentence} ${account_info_sentence}
      </p>
    `
  }

  get knownInfoTemplate() {
    const v = this.validator
    const i = v.known_info || {}
    const knownInfo = html`
      <attribute-pairs class="knownInfo">
        <dt>ID</dt><dd>${i.id}</dd>
        <dt>Name</dt><dd>${i.name}</dd>
        <dt>Address</dt><dd>${i.host}:${i.port}</dd>
      </attribute-pairs>
    `
    return html`
    <h4>Verified information</h4>
    ${ v.known_info ? knownInfo :
      html`<p>This validator is not listed in the stellar.org
        list of <a href="https://www.stellar.org/developers/guides/nodes.html">
        known validators</a>.</p>`
    }`
  }

  get accountInfoTemplate() {
    const v = this.validator
    const i = v.account_info || {}
    const accountInfo = html`
      <attribute-pairs class="accountInfo">
        <dt>Name</dt><dd>${i.ORG_NAME}</dd>
        <dt>Website</dt><dd>${i.ORG_URL}</dd>
        <dt>E-mail</dt><dd>${i.ORG_OFFICIAL_EMAIL}</dd>
      </attribute-pairs>
      ${ i.keybase ?
        html`<p>Visit the node's <a href="https://keybase.io/${i.keybase}">keybase account</a> for social proof.</p>`
      : html`<p>Node has not registered a <a href="https://keybase.io">Keybase</a> account, so no social proof available.</p>`
      }
    `
    return html`
    <h4>Account information</h4>
    ${ v.account_info ? accountInfo :
      html`<p>
        This node has not connected a <a href="https://github.com/stellar/stellar-protocol/issues/111">
        Stellar account</a>.</p>`
    }`
  }

  get identityTemplate() {
    const v = this.validator
    return html`
      <h3>Node Identity</h3>
      ${ this.accountInfoTemplate }
      ${ this.knownInfoTemplate }
    `
  }

  get quorumsetTemplate() {
    const getV = (v) => this.data.accounts[v]
    const renderQuorum = (quorum) => {
      return html`
        <h4>Quorum with threshold ${quorum.threshold}</h4>
        <ul class="quorum">
          ${ quorum.validators.map( v => html`<li><validator-link peer-id$=${v}></validator-link></li>`)}
          ${ quorum.inner_sets.map( is => renderQuorum(is)) }
        </ul>
      `
    }
    const quorum = this.validator.quorum
    return html`
      <h3>Quorumset</h3>
      ${ quorum ? renderQuorum(this.validator.quorum) : html`<p>This validator is not taking part in any quorumset.<p>` }
    `
  }

  get trustInformationTemplate() {
    const v = this.validator

    const visitedNodes = {}
    const maxDepth = 0

    const getTrustHierarchy = (n, depth) => {
      if (visitedNodes[n.peer_id] || depth > maxDepth) {
        return { node: n }
      }

      visitedNodes[n.peer_id] = true
      return {
        node: n,
        children: n.trustingNodes.map(cn => getTrustHierarchy(cn, depth + 1))
      }
    }

    const trustHierarchy = getTrustHierarchy(v, 0)
    const onNodeClick = (d) => {
      navigateToValidator(d.node)
    }

    return html`
      <h3>Trust information</h3>
      <p>This node receives ${v.displayTrustIndex} of trust from the network.</p>

      <validator-tree data=${trustHierarchy} onNodeClick=${onNodeClick}></validator-tree>
      <!--
      <h4>Trusting nodes</h4>
      <attribute-pairs>
        ${ v.trustingNodes.map(n => {
          return html`
            <dt><validator-link peer-id$=${n.peer_id}></validator-link></dt>
            <dd>${ displayTrustIndex(n.trustFor(v))}</dd>
          `})
        }
      </attribute-pairs> <!-->
    `
  }

  get validatorTemplate() {
    return this.fetchData().then(() => {
      return html`
        <link rel="stylesheet" href="/styles/shared.css">
        <h2>${this.validator.displayName}</h2>
        ${ this.introductionTemplate }
        ${ this.identityTemplate }
        ${ this.trustInformationTemplate }
        ${ this.quorumsetTemplate }
        ${ this.statusTemplate }
        ${ this.networkInformationTemplate }
        ${ this.configurationTemplate }
      `
    })
  }
}

customElements.define(ValidatorPage.is, ValidatorPage);
