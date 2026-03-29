Optimize the CBOR format. Use numerical keys (check RFC 9595) and for data
there are some [tags available](https://www.iana.org/assignments/cbor-tags/cbor-tags.xhtml).

Create machine-readable data describing the file format, in the doc/
folder, and add also human readable documentation there. I can think of
YANG and CDDL but you may find more.

Also enums (e.g. zones) can be implemented as enums. In the end, only texts
should end up being texts, everything else should be binary.
If you lack a binary representation for any kind of data,
describe your problem and you'll get some guidance.
