// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Tribun
/// @notice Etkinlik biletini cüzdan adresine yazar. Tutar bakiyeden düşer, iade edilince geri yazılır.
contract Tribun {
    struct EventInfo {
        string name;
        string whenLabel;
        uint32 supply;
        uint32 issued;
    }

    struct Ticket {
        uint256 eventId;
        address owner;
        bool exists;
        bool handed;
    }

    uint256 private constant ID_BASE = 1_000_000_000;
    uint256 private constant ID_SPAN = 9_000_000_000;
    uint256 public constant PRICE = 0.0002 ether;
    bytes4 private constant ERC165 = 0x01ffc9a7;
    bytes4 private constant ERC721 = 0x80ac58cd;
    bytes4 private constant ERC721_METADATA = 0x5b5e139f;
    bytes4 private constant RECEIVED = 0x150b7a02;

    EventInfo[] private _events;
    mapping(uint256 => Ticket) private _byId;
    uint256 private _issuedTotal;
    mapping(address => mapping(uint256 => bool)) public claimed;
    mapping(address => uint256[]) private _byOwner;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    constructor() {
        _events.push(EventInfo(unicode"Hep Yeni Kal Fest", unicode"2 Ekim 2026", 120, 0));
        _events.push(EventInfo(unicode"Amr Diab", unicode"3 Ekim 2026", 50, 0));
        _events.push(EventInfo(unicode"Bir Baba Hamlet", unicode"20 Ekim 2026", 80, 0));
        _events.push(EventInfo(unicode"Yann Tiersen", unicode"10 Ekim 2026", 60, 0));
        _events.push(EventInfo(unicode"Sakarya Festivali", unicode"8 Ekim 2026", 200, 0));
        _events.push(EventInfo(unicode"Duman", unicode"28 Ekim 2026", 70, 0));
        _events.push(EventInfo(unicode"Sertab Erener", unicode"16 Ekim 2026", 90, 0));
        _events.push(EventInfo(unicode"Mario Frangoulis", unicode"7 Ocak 2027", 40, 0));
    }

    function claim(uint256 eventId) external payable returns (uint256 ticketId) {
        require(msg.value == PRICE, "price");
        require(eventId < _events.length, "event");
        require(!claimed[msg.sender][eventId], "already");
        EventInfo storage ev = _events[eventId];
        require(ev.issued < ev.supply, "sold out");

        ev.issued += 1;
        claimed[msg.sender][eventId] = true;
        ticketId = _freshId(eventId);
        _byId[ticketId] = Ticket(eventId, msg.sender, true, false);
        _issuedTotal += 1;
        _byOwner[msg.sender].push(ticketId);
        emit Transfer(address(0), msg.sender, ticketId);
    }

    function refund(uint256 ticketId) external {
        Ticket storage ticket = _byId[ticketId];
        require(ticket.exists, "invalid");
        require(ticket.owner == msg.sender, "owner");
        require(!ticket.handed, "handed");

        uint256 eventId = ticket.eventId;
        ticket.exists = false;
        claimed[msg.sender][eventId] = false;
        _events[eventId].issued -= 1;
        _issuedTotal -= 1;

        uint256[] storage list = _byOwner[msg.sender];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == ticketId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        delete _tokenApprovals[ticketId];
        emit Transfer(msg.sender, address(0), ticketId);

        (bool paid, ) = msg.sender.call{value: PRICE}("");
        require(paid, "pay");
    }

    function name() external pure returns (string memory) {
        return "Loca";
    }

    function symbol() external pure returns (string memory) {
        return "LOCA";
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_byId[tokenId].exists, "invalid");
        return "";
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == ERC165 || interfaceId == ERC721 || interfaceId == ERC721_METADATA;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "owner");
        return _byOwner[owner].length;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        require(_byId[tokenId].exists, "invalid");
        return _byId[tokenId].owner;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_byId[tokenId].exists, "invalid");
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function approve(address to, uint256 tokenId) external {
        address owner = _byId[tokenId].owner;
        require(_byId[tokenId].exists, "invalid");
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "owner");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "owner");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        _transfer(from, to, tokenId);
        _received(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        _transfer(from, to, tokenId);
        _received(from, to, tokenId, data);
    }

    function _transfer(address from, address to, uint256 tokenId) private {
        Ticket storage ticket = _byId[tokenId];
        require(ticket.exists, "invalid");
        require(ticket.owner == from, "owner");
        require(msg.sender == from || _tokenApprovals[tokenId] == msg.sender || _operatorApprovals[from][msg.sender], "owner");
        require(to != address(0) && to != from, "to");
        uint256 eventId = ticket.eventId;
        require(!claimed[to][eventId], "taken");

        claimed[from][eventId] = false;
        claimed[to][eventId] = true;
        ticket.owner = to;
        ticket.handed = true;
        delete _tokenApprovals[tokenId];

        uint256[] storage list = _byOwner[from];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == tokenId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        _byOwner[to].push(tokenId);
        emit Transfer(from, to, tokenId);
    }

    function _received(address from, address to, uint256 tokenId, bytes memory data) private {
        if (to.code.length == 0) return;
        (bool ok, bytes memory ret) = to.call(
            abi.encodeWithSelector(RECEIVED, msg.sender, from, tokenId, data)
        );
        require(ok && ret.length >= 32 && abi.decode(ret, (bytes4)) == RECEIVED, "receiver");
    }

    function _freshId(uint256 eventId) private view returns (uint256 id) {
        id = ID_BASE + (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, eventId, _issuedTotal))) % ID_SPAN);
        while (_byId[id].exists) {
            id = ID_BASE + ((id - ID_BASE + 1) % ID_SPAN);
        }
    }

    function handed(uint256 ticketId) external view returns (bool) {
        return _byId[ticketId].handed;
    }

    function ticketsOf(address owner) external view returns (uint256[] memory) {
        return _byOwner[owner];
    }

    function verify(uint256 ticketId)
        external
        view
        returns (bool valid, uint256 eventId, address owner)
    {
        if (!_byId[ticketId].exists) {
            return (false, 0, address(0));
        }
        Ticket memory t = _byId[ticketId];
        return (true, t.eventId, t.owner);
    }

    function eventCount() external view returns (uint256) {
        return _events.length;
    }

    function eventInfo(uint256 id)
        external
        view
        returns (string memory name, string memory whenLabel, uint32 supply, uint32 issued)
    {
        require(id < _events.length, "event");
        EventInfo storage ev = _events[id];
        return (ev.name, ev.whenLabel, ev.supply, ev.issued);
    }

    function ticketCount() external view returns (uint256) {
        return _issuedTotal;
    }
}
